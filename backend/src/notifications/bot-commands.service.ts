import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import * as TelegramBot from 'node-telegram-bot-api';
import { RoleType } from '@prisma/client';

/** Время жизни диалоговой сессии (ожидание ввода суммы и т.п.). */
const SESSION_TTL_MS = 15 * 60 * 1000;
/** Префикс всех callback_data этого сервиса, чтобы не пересекаться с импортом Excel. */
const CB = 'df:';
/** Сколько последних дней показывать в выборе «Другой день». */
const RECENT_DAYS = 14;

// Подписи кнопок главного меню (reply keyboard). Сравниваются с текстом сообщения.
const BTN_CASH = '💵 Наличка';
const BTN_CARD = '💳 Карта';
const BTN_EXPENSE = '🧾 Расход';
const BTN_OTHER_DAY = '📅 Другой день';
const BTN_MONTH = '📊 Сводка за месяц';

type FlowAction = 'cash' | 'card' | 'exp' | 'view';
type Awaiting = 'amount' | 'expense' | 'manualDate' | null;

interface AccessBar {
	id: string;
	name: string;
}

interface Session {
	userId: string;
	userName: string;
	role: RoleType;
	bars: AccessBar[];
	barId?: string;
	barName?: string;
	/** Выбранная дата в формате yyyy-MM-dd. */
	selectedDate: string;
	/** Явно ли пользователь выбрал день (для сценария «Другой день»). */
	dayChosen: boolean;
	pendingAction?: FlowAction;
	awaiting: Awaiting;
	expiresAt: number;
}

@Injectable()
export class BotCommandsService {
	private readonly logger = new Logger(BotCommandsService.name);
	private bot: TelegramBot | null = null;
	/** chatId -> текущее состояние диалога. */
	private sessions = new Map<number, Session>();

	constructor(
		private prisma: PrismaService,
		@Inject(forwardRef(() => NotificationsService))
		private notifications: NotificationsService,
	) {}

	/**
	 * Навешивает диалоговые обработчики на уже созданный экземпляр бота.
	 * Вызывается из NotificationsService после инициализации бота.
	 */
	register(bot: TelegramBot) {
		this.bot = bot;

		bot.onText(/^\/(start|menu)\b/, (msg) => {
			void this.handleStart(msg);
		});

		bot.on('message', (msg) => {
			// Документы (Excel) обрабатывает NotificationsService отдельно.
			if (msg.document) return;
			const text = msg.text;
			if (!text) return;
			// Команды (/start, /menu и т.п.) обрабатываются через onText.
			if (text.startsWith('/')) return;
			void this.handleMessage(msg, text.trim());
		});

		bot.on('callback_query', (query) => {
			const data = query.data;
			if (!data || !data.startsWith(CB)) return; // не наш callback
			void this.handleCallback(query);
		});

		this.logger.log('Bot command handlers registered');
	}

	// ─────────────────────────── Обработчики ───────────────────────────

	private async handleStart(msg: TelegramBot.Message) {
		const chatId = msg.chat.id;
		const user = await this.loadUser(msg.from?.id);
		if (!user) {
			await this.send(chatId, 'Вы не зарегистрированы в Bar Bot. Обратитесь к администратору.');
			return;
		}
		this.sessions.delete(chatId);
		await this.sendMenu(
			chatId,
			user.role,
			`Здравствуйте, ${user.name}!\n\nВыберите действие кнопками ниже.`,
		);
	}

	private async handleMessage(msg: TelegramBot.Message, text: string) {
		const chatId = msg.chat.id;

		// Кнопки главного меню всегда имеют приоритет над ожиданием ввода —
		// пользователь мог передумать и нажать другую кнопку.
		switch (text) {
			case BTN_CASH:
				return this.startAction(chatId, msg.from?.id, 'cash');
			case BTN_CARD:
				return this.startAction(chatId, msg.from?.id, 'card');
			case BTN_EXPENSE:
				return this.startAction(chatId, msg.from?.id, 'exp');
			case BTN_OTHER_DAY:
				return this.startOtherDay(chatId, msg.from?.id);
			case BTN_MONTH:
				return this.startMonthSummary(chatId, msg.from?.id);
		}

		// Иначе — это ввод для активной сессии (сумма / расход / дата).
		const session = this.getSession(chatId);
		if (!session || !session.awaiting) {
			// Нет активного ожидания — подсказываем меню.
			const user = await this.loadUser(msg.from?.id);
			if (user) await this.sendMenu(chatId, user.role, 'Выберите действие кнопками ниже.');
			return;
		}

		if (session.awaiting === 'manualDate') {
			return this.handleManualDate(chatId, session, text);
		}
		if (session.awaiting === 'amount') {
			return this.handleAmount(chatId, session, text);
		}
		if (session.awaiting === 'expense') {
			return this.handleExpense(chatId, session, text);
		}
	}

	private async handleCallback(query: TelegramBot.CallbackQuery) {
		const bot = this.bot;
		if (!bot) return;
		const chatId = query.message?.chat?.id;
		const data = query.data ?? '';
		if (chatId == null) {
			await bot.answerCallbackQuery(query.id);
			return;
		}
		await bot.answerCallbackQuery(query.id);

		const rest = data.slice(CB.length); // убираем 'df:'
		const [kind, ...params] = rest.split(':');

		const session = this.getSession(chatId);
		if (!session) {
			await this.send(chatId, 'Сессия истекла. Нажмите кнопку в меню ещё раз.');
			return;
		}

		if (kind === 'bar') {
			const barId = params.join(':');
			const bar = session.bars.find((b) => b.id === barId);
			if (!bar) {
				await this.send(chatId, 'Бар не найден. Начните заново.');
				return;
			}
			session.barId = bar.id;
			session.barName = bar.name;
			this.touch(session);
			return this.continueFlow(chatId, session);
		}

		if (kind === 'day') {
			session.selectedDate = params[0];
			session.dayChosen = true;
			this.touch(session);
			return this.continueFlow(chatId, session);
		}

		if (kind === 'manual') {
			session.awaiting = 'manualDate';
			this.touch(session);
			await this.send(chatId, 'Введите дату в формате ДД.ММ.ГГГГ (например 05.09.2026):');
			return;
		}

		if (kind === 'add') {
			const action = params[0] as FlowAction; // cash | card | exp
			session.pendingAction = action;
			this.touch(session);
			return this.continueFlow(chatId, session);
		}
	}

	// ─────────────────────────── Старт сценариев ───────────────────────────

	private async startAction(
		chatId: number,
		fromId: number | undefined,
		action: FlowAction,
	) {
		const user = await this.loadUser(fromId);
		if (!user) {
			await this.send(chatId, 'Вы не зарегистрированы в Bar Bot.');
			return;
		}
		if (user.bars.length === 0) {
			await this.send(chatId, 'К вашему аккаунту не привязан ни один бар. Обратитесь к администратору.');
			return;
		}
		const session = this.newSession(user);
		session.pendingAction = action;
		session.selectedDate = this.today();
		this.sessions.set(chatId, session);
		return this.continueFlow(chatId, session);
	}

	private async startOtherDay(chatId: number, fromId: number | undefined) {
		const user = await this.loadUser(fromId);
		if (!user) {
			await this.send(chatId, 'Вы не зарегистрированы в Bar Bot.');
			return;
		}
		if (user.bars.length === 0) {
			await this.send(chatId, 'К вашему аккаунту не привязан ни один бар.');
			return;
		}
		const session = this.newSession(user);
		session.pendingAction = 'view';
		this.sessions.set(chatId, session);
		// continueFlow сам запросит бар (если их несколько), затем день, затем покажет сводку.
		return this.continueFlow(chatId, session);
	}

	private async startMonthSummary(chatId: number, fromId: number | undefined) {
		const user = await this.loadUser(fromId);
		if (!user) {
			await this.send(chatId, 'Вы не зарегистрированы в Bar Bot.');
			return;
		}
		if (user.role !== RoleType.ADMIN && user.role !== RoleType.MANAGER) {
			await this.send(chatId, 'Сводка за месяц доступна только администратору и менеджеру.');
			return;
		}
		const bars = await this.getAccessibleBars(user);
		if (bars.length === 0) {
			await this.send(chatId, 'Нет доступных баров.');
			return;
		}
		await this.sendMonthSummary(chatId, bars);
	}

	// ─────────────────────────── Ядро сценария ───────────────────────────

	/** Продолжает сценарий, докупая недостающие данные (бар → день → ввод/сводка). */
	private async continueFlow(chatId: number, session: Session) {
		// 1. Нужен бар?
		if (!session.barId) {
			if (session.bars.length === 1) {
				session.barId = session.bars[0].id;
				session.barName = session.bars[0].name;
			} else {
				return this.askBar(chatId, session);
			}
		}

		const action = session.pendingAction;

		if (action === 'view') {
			// Для просмотра сначала нужен явно выбранный день.
			if (!session.dayChosen) {
				return this.askDay(chatId);
			}
			return this.showDaySummary(chatId, session);
		}

		if (action === 'cash' || action === 'card') {
			session.awaiting = 'amount';
			this.touch(session);
			const label = action === 'cash' ? 'налички' : 'карты';
			await this.send(
				chatId,
				`Бар: ${session.barName}\nДата: ${this.fmtRu(session.selectedDate)}\n\nВведите сумму ${label} (в сумах). Например: 1 500 000`,
			);
			return;
		}

		if (action === 'exp') {
			session.awaiting = 'expense';
			this.touch(session);
			await this.send(
				chatId,
				`Бар: ${session.barName}\nДата: ${this.fmtRu(session.selectedDate)}\n\nВведите расход в формате: сумма описание\nНапример: 200000 закуп продуктов`,
			);
			return;
		}
	}

	// ─────────────────────────── Ввод значений ───────────────────────────

	private async handleAmount(chatId: number, session: Session, text: string) {
		const amount = this.parseAmount(text);
		if (amount == null) {
			await this.send(chatId, 'Не понял сумму. Введите число, например: 1 500 000');
			return;
		}
		const action = session.pendingAction;
		if (!session.barId || (action !== 'cash' && action !== 'card')) {
			await this.send(chatId, 'Что-то пошло не так. Начните заново через меню.');
			this.sessions.delete(chatId);
			return;
		}

		const dateObj = this.toUtc(session.selectedDate);
		const existing = await this.prisma.revenue.findUnique({
			where: { barId_date: { barId: session.barId, date: dateObj } },
		});

		// Правило: перезаписывать через бота нельзя. Для изменения — мини-апп.
		const already =
			action === 'cash' ? (existing?.cash ?? 0) > 0.01 : (existing?.card ?? 0) > 0.01;
		if (already) {
			const field = action === 'cash' ? 'Наличка' : 'Карта';
			const current = action === 'cash' ? existing!.cash : existing!.card;
			await this.send(
				chatId,
				`${field} за ${this.fmtRu(session.selectedDate)} уже внесена: ${this.money(current)} сум.\n\nЧтобы изменить значение, войдите в мини-апп.`,
			);
			session.awaiting = null;
			return;
		}

		const result = await this.prisma.revenue.upsert({
			where: { barId_date: { barId: session.barId, date: dateObj } },
			create: {
				barId: session.barId,
				date: dateObj,
				cash: action === 'cash' ? amount : 0,
				card: action === 'card' ? amount : 0,
				createdById: session.userId,
				updatedById: session.userId,
			},
			update:
				action === 'cash'
					? { cash: amount, updatedById: session.userId }
					: { card: amount, updatedById: session.userId },
			include: { bar: true },
		});

		session.awaiting = null;
		const field = action === 'cash' ? 'Наличка' : 'Карта';
		await this.send(
			chatId,
			`✅ ${field} сохранена.\nБар: ${session.barName}\nДата: ${this.fmtRu(session.selectedDate)}\nСумма: ${this.money(amount)} сум`,
		);

		// Уведомляем админов/менеджеров бара (как при вводе через мини-апп).
		this.notifications
			.notifyRevenueChanged(
				{ bar: result.bar, cash: result.cash, card: result.card, date: result.date },
				session.userName,
			)
			.catch(() => {});
	}

	private async handleExpense(chatId: number, session: Session, text: string) {
		const match = text.match(/^([\d\s.,]+)\s+(.+)$/s);
		if (!match) {
			await this.send(
				chatId,
				'Формат: сумма описание. Например: 200000 закуп продуктов',
			);
			return;
		}
		const amount = this.parseAmount(match[1]);
		const description = match[2].trim();
		if (amount == null || amount <= 0 || !description) {
			await this.send(
				chatId,
				'Не понял. Введите: сумма описание. Например: 200000 закуп продуктов',
			);
			return;
		}
		if (!session.barId) {
			await this.send(chatId, 'Что-то пошло не так. Начните заново через меню.');
			this.sessions.delete(chatId);
			return;
		}

		const dateObj = this.toUtc(session.selectedDate);
		const result = await this.prisma.expense.create({
			data: {
				barId: session.barId,
				amount,
				description,
				date: dateObj,
			},
		});

		session.awaiting = null;
		await this.send(
			chatId,
			`✅ Расход добавлен.\nБар: ${session.barName}\nДата: ${this.fmtRu(session.selectedDate)}\nСумма: ${this.money(amount)} сум\nОписание: ${description}`,
		);

		this.notifications
			.notifyExpenseChanged(
				{ barId: result.barId, amount: result.amount, description: result.description, date: result.date },
				'created',
				session.userName,
			)
			.catch(() => {});
	}

	private async handleManualDate(chatId: number, session: Session, text: string) {
		const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
		if (!m) {
			await this.send(chatId, 'Дата должна быть в формате ДД.ММ.ГГГГ (например 05.09.2026).');
			return;
		}
		const [, dd, mm, yyyy] = m;
		const ymd = `${yyyy}-${mm}-${dd}`;
		const d = this.toUtc(ymd);
		if (
			Number.isNaN(d.getTime()) ||
			d.getUTCDate() !== Number(dd) ||
			d.getUTCMonth() + 1 !== Number(mm)
		) {
			await this.send(chatId, 'Такой даты не существует. Попробуйте ещё раз (ДД.ММ.ГГГГ).');
			return;
		}
		session.selectedDate = ymd;
		session.dayChosen = true;
		session.awaiting = null;
		this.touch(session);
		return this.continueFlow(chatId, session);
	}

	// ─────────────────────────── Показ данных ───────────────────────────

	private async showDaySummary(chatId: number, session: Session) {
		if (!session.barId) return;
		const dateObj = this.toUtc(session.selectedDate);
		const nextDay = new Date(dateObj);
		nextDay.setUTCDate(nextDay.getUTCDate() + 1);

		const [revenue, expenses] = await Promise.all([
			this.prisma.revenue.findUnique({
				where: { barId_date: { barId: session.barId, date: dateObj } },
			}),
			this.prisma.expense.findMany({
				where: { barId: session.barId, date: { gte: dateObj, lt: nextDay } },
				orderBy: { createdAt: 'asc' },
			}),
		]);

		const header = `Бар: ${session.barName}\nДата: ${this.fmtRu(session.selectedDate)}`;

		if (!revenue && expenses.length === 0) {
			await this.sendWithAddButtons(
				chatId,
				`${header}\n\nЗа этот день нет записей.`,
			);
			return;
		}

		const cash = revenue?.cash ?? 0;
		const card = revenue?.card ?? 0;
		const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
		const lines = [
			header,
			'',
			`Наличка: ${this.money(cash)} сум`,
			`Карта: ${this.money(card)} сум`,
			`Итого (нал+карта): ${this.money(cash + card)} сум`,
		];
		if (expenses.length > 0) {
			lines.push('', `Расходы: ${this.money(expTotal)} сум`);
			for (const e of expenses) {
				lines.push(`  • ${this.money(e.amount)} — ${e.description}`);
			}
		} else {
			lines.push('', 'Расходов нет.');
		}

		await this.sendWithAddButtons(chatId, lines.join('\n'));
	}

	private async sendMonthSummary(chatId: number, bars: AccessBar[]) {
		const { start, end, label } = this.currentMonthRange();
		const barIds = bars.map((b) => b.id);

		const [revenues, expenses] = await Promise.all([
			this.prisma.revenue.findMany({
				where: { barId: { in: barIds }, date: { gte: start, lt: end } },
			}),
			this.prisma.expense.findMany({
				where: { barId: { in: barIds }, date: { gte: start, lt: end } },
			}),
		]);

		const lines: string[] = [`📊 Сводка за ${label}`];

		let grandCash = 0;
		let grandCard = 0;
		let grandExp = 0;

		for (const bar of bars) {
			const cash = revenues
				.filter((r) => r.barId === bar.id)
				.reduce((s, r) => s + r.cash, 0);
			const card = revenues
				.filter((r) => r.barId === bar.id)
				.reduce((s, r) => s + r.card, 0);
			const exp = expenses
				.filter((e) => e.barId === bar.id)
				.reduce((s, e) => s + e.amount, 0);

			grandCash += cash;
			grandCard += card;
			grandExp += exp;

			if (bars.length > 1) {
				lines.push(
					'',
					`🏠 ${bar.name}`,
					`  Наличка: ${this.money(cash)} сум`,
					`  Карта: ${this.money(card)} сум`,
					`  Расход: ${this.money(exp)} сум`,
					`  Итого (нал+карта): ${this.money(cash + card)} сум`,
				);
			}
		}

		lines.push('');
		if (bars.length > 1) lines.push('━━━ ИТОГО по всем барам ━━━');
		lines.push(
			`Наличка: ${this.money(grandCash)} сум`,
			`Карта: ${this.money(grandCard)} сум`,
			`Расход: ${this.money(grandExp)} сум`,
			`Итого (нал+карта, без расходов): ${this.money(grandCash + grandCard)} сум`,
		);

		await this.send(chatId, lines.join('\n'));
	}

	// ─────────────────────────── Клавиатуры / отправка ───────────────────────────

	private async sendMenu(chatId: number, role: RoleType, text: string) {
		const rows: TelegramBot.KeyboardButton[][] = [
			[{ text: BTN_CASH }, { text: BTN_CARD }],
			[{ text: BTN_EXPENSE }, { text: BTN_OTHER_DAY }],
		];
		if (role === RoleType.ADMIN || role === RoleType.MANAGER) {
			rows.push([{ text: BTN_MONTH }]);
		}
		await this.bot?.sendMessage(chatId, text, {
			reply_markup: { keyboard: rows, resize_keyboard: true },
		});
	}

	private async askBar(chatId: number, session: Session) {
		const keyboard = session.bars.map((b) => [
			{ text: b.name, callback_data: `${CB}bar:${b.id}` },
		]);
		await this.bot?.sendMessage(chatId, 'Выберите бар:', {
			reply_markup: { inline_keyboard: keyboard },
		});
	}

	private async askDay(chatId: number) {
		const days = this.recentDays(RECENT_DAYS);
		const buttons: TelegramBot.InlineKeyboardButton[][] = [];
		for (let i = 0; i < days.length; i += 2) {
			const row = days.slice(i, i + 2).map((ymd, idx) => ({
				text: this.dayLabel(ymd, i + idx),
				callback_data: `${CB}day:${ymd}`,
			}));
			buttons.push(row);
		}
		buttons.push([{ text: '✏️ Другая дата', callback_data: `${CB}manual` }]);
		await this.bot?.sendMessage(chatId, 'Выберите день:', {
			reply_markup: { inline_keyboard: buttons },
		});
	}

	private async sendWithAddButtons(chatId: number, text: string) {
		await this.bot?.sendMessage(chatId, text, {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '💵 Внести наличку', callback_data: `${CB}add:cash` },
						{ text: '💳 Внести карту', callback_data: `${CB}add:card` },
					],
					[{ text: '🧾 Внести расход', callback_data: `${CB}add:exp` }],
				],
			},
		});
	}

	private async send(chatId: number, text: string) {
		await this.bot?.sendMessage(chatId, text);
	}

	// ─────────────────────────── Данные / утилиты ───────────────────────────

	private async loadUser(telegramId: number | undefined) {
		if (telegramId == null) return null;
		const user = await this.prisma.user.findFirst({
			where: { telegramId: String(telegramId) },
			include: { bars: { include: { bar: true } } },
		});
		if (!user) return null;
		const bars: AccessBar[] =
			user.role === RoleType.ADMIN
				? (await this.getAllActiveBars())
				: user.bars.map((ub) => ({ id: ub.bar.id, name: ub.bar.name }));
		return { id: user.id, name: user.name, role: user.role, bars };
	}

	private async getAccessibleBars(user: {
		role: RoleType;
		bars: AccessBar[];
	}): Promise<AccessBar[]> {
		if (user.role === RoleType.ADMIN) return this.getAllActiveBars();
		return user.bars;
	}

	private async getAllActiveBars(): Promise<AccessBar[]> {
		const bars = await this.prisma.bar.findMany({
			where: { isActive: true },
			orderBy: { name: 'asc' },
			select: { id: true, name: true },
		});
		return bars;
	}

	private newSession(user: {
		id: string;
		name: string;
		role: RoleType;
		bars: AccessBar[];
	}): Session {
		return {
			userId: user.id,
			userName: user.name,
			role: user.role,
			bars: user.bars,
			selectedDate: this.today(),
			dayChosen: false,
			awaiting: null,
			expiresAt: Date.now() + SESSION_TTL_MS,
		};
	}

	private getSession(chatId: number): Session | null {
		const s = this.sessions.get(chatId);
		if (!s) return null;
		if (Date.now() > s.expiresAt) {
			this.sessions.delete(chatId);
			return null;
		}
		return s;
	}

	private touch(session: Session) {
		session.expiresAt = Date.now() + SESSION_TTL_MS;
	}

	private parseAmount(text: string): number | null {
		// Суммы в сумах — целые. Убираем пробелы и разделители тысяч.
		const digits = text.replace(/[^\d]/g, '');
		if (!digits) return null;
		const n = Number(digits);
		return Number.isFinite(n) && n >= 0 ? n : null;
	}

	private money(n: number): string {
		return Math.round(n).toLocaleString('ru-RU');
	}

	/** Сегодняшняя дата в часовом поясе Ташкента (yyyy-MM-dd). */
	private today(): string {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Asia/Tashkent',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(new Date());
	}

	private toUtc(ymd: string): Date {
		return new Date(ymd + 'T00:00:00.000Z');
	}

	private fmtRu(ymd: string): string {
		const [y, m, d] = ymd.split('-');
		return `${d}.${m}.${y}`;
	}

	private recentDays(count: number): string[] {
		const base = this.toUtc(this.today());
		const res: string[] = [];
		for (let i = 0; i < count; i++) {
			const d = new Date(base);
			d.setUTCDate(d.getUTCDate() - i);
			res.push(d.toISOString().slice(0, 10));
		}
		return res;
	}

	private dayLabel(ymd: string, offset: number): string {
		const [, m, d] = ymd.split('-');
		if (offset === 0) return `Сегодня ${d}.${m}`;
		if (offset === 1) return `Вчера ${d}.${m}`;
		return `${d}.${m}`;
	}

	private currentMonthRange(): { start: Date; end: Date; label: string } {
		const today = this.today(); // yyyy-MM-dd в Ташкенте
		const [y, m] = today.split('-').map(Number);
		const startYmd = `${y}-${String(m).padStart(2, '0')}-01`;
		let ny = y;
		let nm = m + 1;
		if (nm > 12) {
			nm = 1;
			ny += 1;
		}
		const endYmd = `${ny}-${String(nm).padStart(2, '0')}-01`;
		const months = [
			'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
			'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
		];
		return {
			start: this.toUtc(startYmd),
			end: this.toUtc(endYmd),
			label: `${months[m - 1]} ${y}`,
		};
	}
}
