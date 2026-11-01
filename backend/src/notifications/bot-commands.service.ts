import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PurchasesService } from '../purchases/purchases.service';
import { SalesService } from '../sales/sales.service';
import { ArrivalsService } from '../arrivals/arrivals.service';
import { ClientsService } from '../clients/clients.service';
import { AiParserService } from './ai-parser.service';
import * as TelegramBot from 'node-telegram-bot-api';
import { RoleType, ProductType, ArrivalType, ClientTransactionType } from '@prisma/client';

/** Время жизни диалоговой сессии (ожидание ввода суммы и т.п.). */
const SESSION_TTL_MS = 15 * 60 * 1000;
/** Префикс всех callback_data этого сервиса, чтобы не пересекаться с импортом Excel. */
const CB = 'df:';
/** Сколько последних дней показывать в выборе «Другой день». */
const RECENT_DAYS = 14;
/** Сколько кандидатов показывать при неоднозначном сопоставлении товара. */
const MAX_CANDIDATES = 5;

// Подписи кнопок главного меню (reply keyboard). Сравниваются с текстом сообщения.
const BTN_CASH = '💵 Наличка';
const BTN_CARD = '💳 Карта';
const BTN_EXPENSE = '🧾 Расход';
const BTN_OTHER_DAY = '📅 Записи по дням';
const BTN_MONTH = '📊 Сводка за месяц';
const BTN_PURCHASE = '📦 Закуп';
const BTN_SP_ARRIVAL = '🏋️ Приход спортпита';
const BTN_SP_SALE = '🛒 Продажа спортпита';
const BTN_DEBT = '💰 Долги';
const BTN_DEBTORS = '📋 Должники';
const BTN_DESKTOP = '💻 Десктоп версия';

type FlowAction = 'cash' | 'card' | 'exp' | 'view';
/** Сценарии закупа/спортпита. */
type ProcFlow = 'purchase' | 'sp_arrival' | 'sp_sale';
type Awaiting =
	| 'amount'
	| 'expense'
	| 'manualDate'
	| 'items'
	| 'debts'
	| 'newClientName'
	| 'newClientPhone'
	| null;

interface AccessBar {
	id: string;
	name: string;
}

/** Вариант товара при неоднозначном сопоставлении (с ценой для подстановки). */
interface Candidate {
	id: string;
	name: string;
	price: number;
}

/** Разобранная позиция списка, которую сопоставляем с каталогом. */
interface DraftItem {
	rawName: string;
	quantity: number;
	/** Цена продажи за единицу (для продажи спортпита — вводит работник; иначе из каталога). */
	price?: number;
	buyerName?: string;
	productId?: string;
	productName?: string;
	candidates?: Candidate[];
	status: 'ok' | 'ambiguous' | 'notfound' | 'skip';
	/** Причина, если позицию нельзя записать. */
	note?: string;
}

/** Кандидат-клиент при неоднозначном сопоставлении имени. */
interface ClientCandidate {
	id: string;
	name: string;
	balance: number;
}

/** Разобранная запись долга/оплаты, которую сопоставляем с клиентами бара. */
interface DebtDraftItem {
	rawName: string;
	amount: number;
	type: 'debt' | 'payment';
	comment?: string;
	clientId?: string;
	clientName?: string;
	/** Текущий баланс клиента (для предпросмотра). */
	balance?: number;
	candidates?: ClientCandidate[];
	status: 'ok' | 'ambiguous' | 'notfound' | 'skip';
}

/** Состояние добавления нового человека (клиента). */
interface NewClientState {
	name?: string;
	/** Индекс строки долга, к которой вернуться после создания (если запущено из долга). */
	debtIndex?: number;
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
	/** Активный сценарий закупа/спортпита. */
	flow?: ProcFlow;
	/** Разобранные позиции для закупа/прихода/продажи. */
	draft?: DraftItem[];
	/** Активен сценарий ввода долгов. */
	debtMode?: boolean;
	/** Разобранные записи долгов/оплат. */
	debtDraft?: DebtDraftItem[];
	/** Активен сценарий добавления человека. */
	addingClient?: boolean;
	/** Данные нового человека в процессе добавления. */
	newClient?: NewClientState;
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
		private purchasesService: PurchasesService,
		private salesService: SalesService,
		@Inject(forwardRef(() => ArrivalsService))
		private arrivalsService: ArrivalsService,
		private clientsService: ClientsService,
		private aiParser: AiParserService,
		private config: ConfigService,
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
			case BTN_PURCHASE:
				return this.startProcurement(chatId, msg.from?.id, 'purchase');
			case BTN_SP_ARRIVAL:
				return this.startProcurement(chatId, msg.from?.id, 'sp_arrival');
			case BTN_SP_SALE:
				return this.startProcurement(chatId, msg.from?.id, 'sp_sale');
			case BTN_DEBT:
				return this.startDebts(chatId, msg.from?.id);
			case BTN_DEBTORS:
				return this.startDebtors(chatId, msg.from?.id);
			case BTN_DESKTOP:
				return this.sendDesktopLink(chatId);
		}

		// Иначе — это ввод для активной сессии (сумма / расход / дата / список).
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
		if (session.awaiting === 'items') {
			return this.handleItemsInput(chatId, session, text);
		}
		if (session.awaiting === 'debts') {
			return this.handleDebtsInput(chatId, session, text);
		}
		if (session.awaiting === 'newClientName') {
			return this.handleNewClientName(chatId, session, text);
		}
		if (session.awaiting === 'newClientPhone') {
			return this.handleNewClientPhone(chatId, session, text);
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

		// Навигация по дням ◀️/▶️ на экране записей
		if (kind === 'nav') {
			const ymd = params[0];
			if (ymd && ymd <= this.today()) {
				session.selectedDate = ymd;
				session.dayChosen = true;
				session.pendingAction = 'view';
				this.touch(session);
			}
			return this.showDaySummary(chatId, session);
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

		// Сопоставление позиций закупа/спортпита
		if (kind === 'pick') {
			const index = Number(params[0]);
			const productId = params.slice(1).join(':');
			const item = session.draft?.[index];
			if (item && item.candidates) {
				const cand = item.candidates.find((c) => c.id === productId);
				if (cand) {
					item.productId = cand.id;
					item.productName = cand.name;
					// Для закупа/прихода подставляем цену из каталога;
					// для продажи спортпита цену вводит работник — не трогаем.
					if (session.flow !== 'sp_sale') {
						item.price = cand.price;
					}
					item.status = 'ok';
				}
			}
			this.touch(session);
			return this.resolveNext(chatId, session);
		}

		if (kind === 'skip') {
			const index = Number(params[0]);
			const item = session.draft?.[index];
			if (item) item.status = 'skip';
			this.touch(session);
			return this.resolveNext(chatId, session);
		}

		if (kind === 'pconfirm') {
			return this.commitProcurement(chatId, session);
		}

		if (kind === 'pcancel') {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Отменено.');
			return;
		}

		// ── Долги: сопоставление клиентов ──
		if (kind === 'dpick') {
			const index = Number(params[0]);
			const clientId = params.slice(1).join(':');
			const item = session.debtDraft?.[index];
			if (item && item.candidates) {
				const cand = item.candidates.find((c) => c.id === clientId);
				if (cand) {
					item.clientId = cand.id;
					item.clientName = cand.name;
					item.balance = cand.balance;
					item.status = 'ok';
				}
			}
			this.touch(session);
			return this.resolveDebtNext(chatId, session);
		}

		if (kind === 'dskip') {
			const index = Number(params[0]);
			const item = session.debtDraft?.[index];
			if (item) item.status = 'skip';
			this.touch(session);
			return this.resolveDebtNext(chatId, session);
		}

		// Добавить человека для ненайденной строки долга
		if (kind === 'dnew') {
			const index = Number(params[0]);
			return this.startAddClientForDebt(chatId, session, index);
		}

		if (kind === 'dconfirm') {
			return this.commitDebts(chatId, session);
		}

		if (kind === 'dcancel') {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Отменено.');
			return;
		}

		// Добавить человека (из списка должников / меню долгов)
		if (kind === 'newclient') {
			return this.startAddClient(chatId, session);
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

	// ───────────────── Закуп / приход спортпита / продажа спортпита ─────────────────

	private async startProcurement(
		chatId: number,
		fromId: number | undefined,
		flow: ProcFlow,
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
		session.flow = flow;
		this.sessions.set(chatId, session);
		// continueFlow выберет бар (или спросит), затем вызовет promptItems.
		return this.continueFlow(chatId, session);
	}

	/** Просит работника прислать список позиций (текстом). */
	private async promptItems(chatId: number, session: Session) {
		session.awaiting = 'items';
		this.touch(session);
		const header = `Бар: ${session.barName}`;
		if (session.flow === 'purchase') {
			await this.send(
				chatId,
				`${header}\n\n📦 Закуп. Напишите, что пришло — название и количество, каждый товар с новой строки или через запятую.\nНапример:\nкола 10\nвода 20\nред булл 12`,
			);
		} else if (session.flow === 'sp_arrival') {
			await this.send(
				chatId,
				`${header}\n\n🏋️ Приход спортпита. Напишите список спортпита и количество.\nНапример:\nкреатин 5\nвей протеин 3`,
			);
		} else if (session.flow === 'sp_sale') {
			await this.send(
				chatId,
				`${header}\n\n🛒 Продажа спортпита. Формат: название количество цена [кому], каждая продажа с новой строки.\nНапример:\nкреатин 1 150000 Иван\nвей протеин 2 300000`,
			);
		}
	}

	/** Разбирает присланный список и сопоставляет позиции с каталогом. */
	private async handleItemsInput(chatId: number, session: Session, text: string) {
		if (!session.barId || !session.flow) {
			await this.send(chatId, 'Что-то пошло не так. Начните заново через меню.');
			this.sessions.delete(chatId);
			return;
		}

		// Сначала пробуем умный разбор через Claude, при неудаче — эвристика.
		let parsed = await this.aiParser.parseItems(text, session.flow);
		if (!parsed || parsed.length === 0) {
			parsed =
				session.flow === 'sp_sale' ? this.parseSaleLines(text) : this.parseNameQty(text);
		}

		if (parsed.length === 0) {
			await this.send(chatId, 'Не удалось разобрать список. Попробуйте ещё раз, каждую позицию с новой строки.');
			return;
		}

		const draft: DraftItem[] = [];
		for (const p of parsed) {
			if (p.note) {
				// строку не удалось распознать
				draft.push({ rawName: p.name, quantity: 0, status: 'notfound', note: p.note });
				continue;
			}
			// Для продажи спортпита обязательна цена
			if (session.flow === 'sp_sale' && (!p.price || p.price <= 0)) {
				draft.push({ rawName: p.name, quantity: p.quantity, status: 'notfound', note: 'не указана цена' });
				continue;
			}
			const m = await this.matchOne(session.barId, p.name, session.flow);
			draft.push({
				rawName: p.name,
				quantity: p.quantity,
				price: session.flow === 'sp_sale' ? p.price : m.price,
				buyerName: p.buyer,
				productId: m.productId,
				productName: m.productName,
				candidates: m.candidates,
				status: m.status,
			});
		}

		session.draft = draft;
		session.awaiting = null;
		this.touch(session);
		return this.resolveNext(chatId, session);
	}

	/** Находит следующую неоднозначную/ненайденную позицию и просит выбрать; иначе — подтверждение. */
	private async resolveNext(chatId: number, session: Session) {
		const draft = session.draft ?? [];
		const idx = draft.findIndex(
			(d) => d.status === 'ambiguous' || d.status === 'notfound',
		);
		if (idx === -1) {
			return this.showProcurementConfirm(chatId, session);
		}

		const item = draft[idx];
		const buttons: TelegramBot.InlineKeyboardButton[][] = [];
		if (item.status === 'ambiguous' && item.candidates) {
			for (const c of item.candidates) {
				const label = c.price > 0 ? `${c.name} — ${this.money(c.price)}` : `${c.name} (цена не задана)`;
				buttons.push([{ text: label, callback_data: `${CB}pick:${idx}:${c.id}` }]);
			}
			buttons.push([{ text: '⛔ Пропустить', callback_data: `${CB}skip:${idx}` }]);
			await this.bot?.sendMessage(
				chatId,
				`«${item.rawName}» — уточните товар (×${item.quantity}):`,
				{ reply_markup: { inline_keyboard: buttons } },
			);
		} else {
			// notfound
			buttons.push([{ text: '⛔ Пропустить', callback_data: `${CB}skip:${idx}` }]);
			await this.bot?.sendMessage(
				chatId,
				`«${item.rawName}» — не найдено в каталоге. Добавьте товар в мини-аппе или пропустите.`,
				{ reply_markup: { inline_keyboard: buttons } },
			);
		}
	}

	/** Показывает итоговый список на подтверждение. */
	private async showProcurementConfirm(chatId: number, session: Session) {
		const draft = session.draft ?? [];
		const okItems = draft.filter((d) => d.status === 'ok' && d.productId);
		const excluded = draft.filter((d) => d.status === 'skip' || d.status === 'notfound');

		if (okItems.length === 0) {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Нет позиций для записи. Операция отменена.');
			return;
		}

		const lines: string[] = [`Бар: ${session.barName}`];
		let total = 0;

		if (session.flow === 'purchase') {
			lines.push('', '📦 Закуп — проверьте:');
			for (const d of okItems) {
				const price = d.price ?? 0;
				const sum = price * d.quantity;
				total += sum;
				const warn = price <= 0 ? '  ⚠️ цена не задана' : '';
				lines.push(`  • ${d.productName} ×${d.quantity} × ${this.money(price)} = ${this.money(sum)}${warn}`);
			}
			lines.push('', `Итого закуп: ${this.money(total)} сум`);
		} else if (session.flow === 'sp_arrival') {
			lines.push('', '🏋️ Приход спортпита — проверьте:');
			for (const d of okItems) {
				lines.push(`  • ${d.productName} ×${d.quantity}`);
			}
		} else if (session.flow === 'sp_sale') {
			lines.push('', '🛒 Продажа спортпита — проверьте:');
			for (const d of okItems) {
				const price = d.price ?? 0;
				const sum = price * d.quantity;
				total += sum;
				const buyer = d.buyerName ? ` — ${d.buyerName}` : '';
				lines.push(`  • ${d.productName} ×${d.quantity} × ${this.money(price)} = ${this.money(sum)}${buyer}`);
			}
			lines.push('', `Итого продажа: ${this.money(total)} сум`);
		}

		if (excluded.length > 0) {
			lines.push('', 'Не будут записаны:');
			for (const d of excluded) {
				lines.push(`  ⛔ ${d.rawName}${d.note ? ` (${d.note})` : ''}`);
			}
		}

		await this.bot?.sendMessage(chatId, lines.join('\n'), {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '✅ Подтвердить', callback_data: `${CB}pconfirm` },
						{ text: 'Отмена', callback_data: `${CB}pcancel` },
					],
				],
			},
		});
	}

	/** Записывает подтверждённые позиции в базу. */
	private async commitProcurement(chatId: number, session: Session) {
		const draft = session.draft ?? [];
		const okItems = draft.filter((d) => d.status === 'ok' && d.productId);
		if (!session.barId || !session.flow || okItems.length === 0) {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Нечего записывать.');
			return;
		}
		const barId = session.barId;

		try {
			if (session.flow === 'purchase') {
				const result = await this.purchasesService.create({
					barId,
					items: okItems.map((d) => ({ productId: d.productId!, quantity: d.quantity })),
				});
				this.sessions.delete(chatId);
				await this.send(
					chatId,
					`✅ Закуп записан.\nБар: ${session.barName}\nПозиций: ${okItems.length}\nСумма: ${this.money(result.totalAmount)} сум`,
				);
			} else if (session.flow === 'sp_arrival') {
				await this.arrivalsService.create(session.userId, {
					barId,
					type: ArrivalType.ARRIVAL,
					items: okItems.map((d) => ({ productId: d.productId!, quantity: d.quantity })),
				});
				this.sessions.delete(chatId);
				await this.send(
					chatId,
					`✅ Приход спортпита записан, остатки обновлены.\nБар: ${session.barName}\nПозиций: ${okItems.length}`,
				);
			} else if (session.flow === 'sp_sale') {
				const done: string[] = [];
				const failed: string[] = [];
				for (const d of okItems) {
					try {
						await this.salesService.create(session.userId, {
							barId,
							productId: d.productId!,
							quantity: d.quantity,
							price: d.price ?? 0,
							buyerName: d.buyerName,
						});
						done.push(`${d.productName} ×${d.quantity}`);
					} catch (e: any) {
						failed.push(`${d.productName} — ${e?.message || 'ошибка'}`);
					}
				}
				this.sessions.delete(chatId);
				const lines = [`🛒 Продажа спортпита — ${session.barName}`];
				if (done.length) lines.push('', '✅ Записано:', ...done.map((s) => `  • ${s}`));
				if (failed.length) lines.push('', '❌ Не записано:', ...failed.map((s) => `  • ${s}`));
				await this.send(chatId, lines.join('\n'));
			}
		} catch (e: any) {
			this.sessions.delete(chatId);
			this.logger.warn('commitProcurement error', e?.message || e);
			await this.send(chatId, `Ошибка записи: ${e?.message || 'неизвестная ошибка'}`);
		}
	}

	/** Сопоставляет одно название с товаром каталога нужного типа. */
	private async matchOne(
		barId: string,
		term: string,
		flow: ProcFlow,
	): Promise<Pick<DraftItem, 'status' | 'productId' | 'productName' | 'price' | 'candidates'>> {
		const typeFilter =
			flow === 'purchase' ? { not: ProductType.SPORT_PIT } : ProductType.SPORT_PIT;
		// Берём все активные цены товара (по всем барам), чтобы цену можно было
		// подхватить, даже если для выбранного бара она не задана.
		const include = {
			barProducts: { where: { isActive: true }, select: { price: true, barId: true } },
		};
		const search = term.trim();

		// 1. Точное совпадение по названию
		let products = await this.prisma.product.findMany({
			where: { isActive: true, type: typeFilter, name: { equals: search, mode: 'insensitive' } },
			include,
			take: 2,
		});

		// 2. Частичное совпадение
		if (products.length !== 1) {
			products = await this.prisma.product.findMany({
				where: { isActive: true, type: typeFilter, name: { contains: search, mode: 'insensitive' } },
				include,
				orderBy: { name: 'asc' },
				take: MAX_CANDIDATES + 1,
			});
			// 3. По первому слову, если ничего не нашли
			if (products.length === 0) {
				const firstWord = search.split(/\s+/)[0];
				if (firstWord && firstWord.length >= 3 && firstWord !== search) {
					products = await this.prisma.product.findMany({
						where: { isActive: true, type: typeFilter, name: { contains: firstWord, mode: 'insensitive' } },
						include,
						orderBy: { name: 'asc' },
						take: MAX_CANDIDATES + 1,
					});
				}
			}
		}

		if (products.length === 0) return { status: 'notfound' };
		if (products.length === 1) {
			const p = products[0];
			return { status: 'ok', productId: p.id, productName: p.name, price: this.sellPrice(p, barId) };
		}
		return {
			status: 'ambiguous',
			candidates: products
				.slice(0, MAX_CANDIDATES)
				.map((p) => ({ id: p.id, name: p.name, price: this.sellPrice(p, barId) })),
		};
	}

	private sellPrice(
		p: {
			defaultPrice: number | null;
			costPrice?: number | null;
			barProducts?: { price: number; barId: string }[];
		},
		barId: string,
	): number {
		// 1. Цена выбранного бара
		const barPrice = p.barProducts?.find((bp) => bp.barId === barId)?.price;
		if (barPrice && barPrice > 0) return barPrice;
		// 2. Цена по умолчанию
		if (p.defaultPrice && p.defaultPrice > 0) return p.defaultPrice;
		// 3. Цена этого же товара в любом другом баре
		const anyPrice = p.barProducts?.find((bp) => bp.price > 0)?.price;
		if (anyPrice && anyPrice > 0) return anyPrice;
		// 4. Себестоимость как последний вариант
		return p.costPrice ?? 0;
	}

	/** Разбор строк «название количество» (закуп / приход спортпита). */
	private parseNameQty(text: string): Array<{ name: string; quantity: number; price?: number; buyer?: string; note?: string }> {
		const chunks = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
		const res: Array<{ name: string; quantity: number; note?: string }> = [];
		for (const c of chunks) {
			// "название 10" / "название - 10 шт"
			let m = c.match(/^(.+?)[\s:=—-]+(\d+(?:[.,]\d+)?)\s*(?:шт|штук|ед|уп|kg|кг|л)?\.?$/i);
			if (!m) {
				// "10 название"
				const m2 = c.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
				if (m2) {
					res.push({ name: m2[2].trim(), quantity: this.qtyInt(m2[1]) });
					continue;
				}
				// без количества — по умолчанию 1
				res.push({ name: c, quantity: 1 });
				continue;
			}
			res.push({ name: m[1].trim(), quantity: this.qtyInt(m[2]) });
		}
		return res;
	}

	/** Разбор строк «название количество цена [кому]» (продажа спортпита). */
	private parseSaleLines(text: string): Array<{ name: string; quantity: number; price?: number; buyer?: string; note?: string }> {
		const chunks = text.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
		const res: Array<{ name: string; quantity: number; price?: number; buyer?: string; note?: string }> = [];
		for (const c of chunks) {
			const m = c.match(/^(.+?)\s+(\d+)\s+([\d][\d\s.,]*?)(?:\s+([^\d].*))?$/);
			if (!m) {
				res.push({ name: c, quantity: 0, note: 'не распознано (нужно: название кол-во цена)' });
				continue;
			}
			res.push({
				name: m[1].trim(),
				quantity: this.qtyInt(m[2]),
				price: this.qtyInt(m[3]),
				buyer: m[4]?.trim() || undefined,
			});
		}
		return res;
	}

	/** Число из строки (убираем разделители тысяч), целое неотрицательное. */
	private qtyInt(s: string): number {
		const digits = String(s).replace(/[^\d]/g, '');
		const n = Number(digits);
		return Number.isFinite(n) ? n : 0;
	}

	// ───────────────── Долги клиентов ─────────────────

	private async startDebts(chatId: number, fromId: number | undefined) {
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
		session.debtMode = true;
		this.sessions.set(chatId, session);
		// continueFlow выберет бар (или спросит), затем вызовет promptDebts.
		return this.continueFlow(chatId, session);
	}

	/** Просит работника прислать список долгов (текстом). */
	private async promptDebts(chatId: number, session: Session) {
		session.awaiting = 'debts';
		this.touch(session);
		await this.send(
			chatId,
			`Бар: ${session.barName}\n\n💰 Долги. Напишите, кто сколько должен — имя и сумму, каждая запись с новой строки.\n` +
				`Можно указать «за что» и возвраты.\nНапример:\n` +
				`Иван 50к за пиво\n` +
				`Сардор 120000\n` +
				`Акмаль вернул 30000`,
		);
	}

	/** Разбирает присланный список долгов и сопоставляет имена с клиентами бара. */
	private async handleDebtsInput(chatId: number, session: Session, text: string) {
		if (!session.barId || !session.debtMode) {
			await this.send(chatId, 'Что-то пошло не так. Начните заново через меню.');
			this.sessions.delete(chatId);
			return;
		}

		// Сначала умный разбор через Claude, при неудаче — эвристика.
		let parsed = await this.aiParser.parseDebts(text);
		if (!parsed || parsed.length === 0) {
			parsed = this.parseDebtLines(text);
		}
		if (parsed.length === 0) {
			await this.send(
				chatId,
				'Не удалось разобрать. Напишите каждую запись с новой строки: имя и сумму. Например: Иван 50000',
			);
			return;
		}

		const draft: DebtDraftItem[] = [];
		for (const p of parsed) {
			const m = await this.matchClient(session.barId, p.name);
			draft.push({
				rawName: p.name,
				amount: p.amount,
				type: p.type,
				comment: p.comment,
				clientId: m.clientId,
				clientName: m.clientName,
				balance: m.balance,
				candidates: m.candidates,
				status: m.status,
			});
		}

		session.debtDraft = draft;
		session.awaiting = null;
		this.touch(session);
		return this.resolveDebtNext(chatId, session);
	}

	/** Сопоставляет имя с клиентом бара. */
	private async matchClient(
		barId: string,
		term: string,
	): Promise<{
		status: 'ok' | 'ambiguous' | 'notfound';
		clientId?: string;
		clientName?: string;
		balance?: number;
		candidates?: ClientCandidate[];
	}> {
		const search = term.trim();
		const base = { barId, isActive: true };

		// 1. Точное совпадение
		let clients = await this.prisma.client.findMany({
			where: { ...base, name: { equals: search, mode: 'insensitive' } },
			select: { id: true, name: true, balance: true },
			take: 2,
		});

		// 2. Частичное совпадение
		if (clients.length !== 1) {
			clients = await this.prisma.client.findMany({
				where: { ...base, name: { contains: search, mode: 'insensitive' } },
				select: { id: true, name: true, balance: true },
				orderBy: { name: 'asc' },
				take: MAX_CANDIDATES + 1,
			});
			// 3. По первому слову
			if (clients.length === 0) {
				const firstWord = search.split(/\s+/)[0];
				if (firstWord && firstWord.length >= 3 && firstWord !== search) {
					clients = await this.prisma.client.findMany({
						where: { ...base, name: { contains: firstWord, mode: 'insensitive' } },
						select: { id: true, name: true, balance: true },
						orderBy: { name: 'asc' },
						take: MAX_CANDIDATES + 1,
					});
				}
			}
		}

		if (clients.length === 0) return { status: 'notfound' };
		if (clients.length === 1) {
			const c = clients[0];
			return { status: 'ok', clientId: c.id, clientName: c.name, balance: c.balance };
		}
		return {
			status: 'ambiguous',
			candidates: clients.slice(0, MAX_CANDIDATES).map((c) => ({ id: c.id, name: c.name, balance: c.balance })),
		};
	}

	/** Находит следующую неоднозначную/ненайденную запись и просит уточнить; иначе — подтверждение. */
	private async resolveDebtNext(chatId: number, session: Session) {
		const draft = session.debtDraft ?? [];
		const idx = draft.findIndex((d) => d.status === 'ambiguous' || d.status === 'notfound');
		if (idx === -1) {
			return this.showDebtConfirm(chatId, session);
		}

		const item = draft[idx];
		const opLabel = item.type === 'payment' ? 'оплата' : 'долг';
		const buttons: TelegramBot.InlineKeyboardButton[][] = [];
		if (item.status === 'ambiguous' && item.candidates) {
			for (const c of item.candidates) {
				buttons.push([{ text: `${c.name} (${this.balanceLabel(c.balance)})`, callback_data: `${CB}dpick:${idx}:${c.id}` }]);
			}
			buttons.push([{ text: '⛔ Пропустить', callback_data: `${CB}dskip:${idx}` }]);
			await this.bot?.sendMessage(
				chatId,
				`«${item.rawName}» — уточните, кто это (${opLabel} ${this.money(item.amount)} сум):`,
				{ reply_markup: { inline_keyboard: buttons } },
			);
		} else {
			// notfound
			buttons.push([{ text: `➕ Добавить «${item.rawName}»`, callback_data: `${CB}dnew:${idx}` }]);
			buttons.push([{ text: '⛔ Пропустить', callback_data: `${CB}dskip:${idx}` }]);
			await this.bot?.sendMessage(
				chatId,
				`«${item.rawName}» — не найден среди клиентов бара. Добавьте человека или пропустите.`,
				{ reply_markup: { inline_keyboard: buttons } },
			);
		}
	}

	/** Показывает итоговый список долгов на подтверждение. */
	private async showDebtConfirm(chatId: number, session: Session) {
		const draft = session.debtDraft ?? [];
		const okItems = draft.filter((d) => d.status === 'ok' && d.clientId);
		const excluded = draft.filter((d) => d.status === 'skip' || d.status === 'notfound');

		if (okItems.length === 0) {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Нет записей для сохранения. Операция отменена.');
			return;
		}

		const lines: string[] = [`Бар: ${session.barName}`, '', '💰 Долги — проверьте:'];
		for (const d of okItems) {
			const op = d.type === 'payment' ? 'оплата' : 'долг';
			// Предпросмотр нового баланса: долг уменьшает, оплата увеличивает.
			const cur = d.balance ?? 0;
			const next = d.type === 'payment' ? cur + d.amount : cur - d.amount;
			const note = d.comment ? ` (${d.comment})` : '';
			lines.push(
				`  • ${d.clientName} — ${op} ${this.money(d.amount)} сум${note}\n     баланс: ${this.balanceLabel(cur)} → ${this.balanceLabel(next)}`,
			);
		}
		if (excluded.length > 0) {
			lines.push('', 'Не будут записаны:');
			for (const d of excluded) {
				lines.push(`  ⛔ ${d.rawName}`);
			}
		}

		await this.bot?.sendMessage(chatId, lines.join('\n'), {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '✅ Подтвердить', callback_data: `${CB}dconfirm` },
						{ text: 'Отмена', callback_data: `${CB}dcancel` },
					],
					[{ text: '➕ Добавить человека', callback_data: `${CB}newclient` }],
				],
			},
		});
	}

	/** Записывает подтверждённые долги/оплаты в базу. */
	private async commitDebts(chatId: number, session: Session) {
		const draft = session.debtDraft ?? [];
		const okItems = draft.filter((d) => d.status === 'ok' && d.clientId);
		if (!session.barId || okItems.length === 0) {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Нечего записывать.');
			return;
		}

		const done: string[] = [];
		const failed: string[] = [];
		for (const d of okItems) {
			try {
				const { client } = await this.clientsService.createTransaction(session.userId, {
					clientId: d.clientId!,
					type: d.type === 'payment' ? ClientTransactionType.PAYMENT : ClientTransactionType.DEBT,
					amount: d.amount,
					comment: d.comment,
				});
				const op = d.type === 'payment' ? 'оплата' : 'долг';
				done.push(`${d.clientName} — ${op} ${this.money(d.amount)} → баланс ${this.balanceLabel(client.balance)}`);
			} catch (e: any) {
				failed.push(`${d.clientName} — ${e?.message || 'ошибка'}`);
			}
		}

		this.sessions.delete(chatId);
		const lines = [`💰 Долги — ${session.barName}`];
		if (done.length) lines.push('', '✅ Записано:', ...done.map((s) => `  • ${s}`));
		if (failed.length) lines.push('', '❌ Не записано:', ...failed.map((s) => `  • ${s}`));
		await this.send(chatId, lines.join('\n'));
	}

	/** Эвристический разбор строк «имя сумма [за что]» для долгов. */
	private parseDebtLines(
		text: string,
	): Array<{ name: string; amount: number; type: 'debt' | 'payment'; comment?: string }> {
		const chunks = text.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
		const res: Array<{ name: string; amount: number; type: 'debt' | 'payment'; comment?: string }> = [];
		for (const c of chunks) {
			const low = c.toLowerCase();
			const type: 'debt' | 'payment' = /(вернул|верну|отдал|отда|погас|заплат|оплат|вн[еёо]с|занёс|занес)/.test(low)
				? 'payment'
				: 'debt';
			// Сумма: число с возможными разделителями и суффиксом к/тыс/млн/кк.
			const m = c.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(млн|кк|тыс\.?|к|k|m)?/i);
			if (!m) continue;
			const amount = this.moneyWithSuffix(m[1], m[2]);
			if (amount < 1) continue;
			// Имя — всё, кроме найденной суммы и служебных слов о возврате/долге.
			const name = c
				.replace(m[0], ' ')
				.replace(/(вернул|верну[лаи]?|отдал[аи]?|отда[лм]|погаси[лаи]?|заплати[лаи]?|оплати[лаи]?|вн[еёо]с|занёс|занес|за\s+\S+|в\s+долг|долг|сум|руб)/gi, ' ')
				.replace(/\s+/g, ' ')
				.trim();
			if (!name) continue;
			// Комментарий «за что»
			const cm = low.match(/за\s+([a-zа-яё\s]+)/i);
			const comment = cm ? cm[1].trim() : undefined;
			res.push({ name, amount, type, comment: comment || undefined });
		}
		return res;
	}

	/** Число с суффиксом тысяч/миллионов → целое в сумах. */
	private moneyWithSuffix(numStr: string, suffix?: string): number {
		const n = Number(String(numStr).replace(/\s/g, '').replace(',', '.'));
		if (!Number.isFinite(n)) return 0;
		const s = (suffix || '').toLowerCase().replace('.', '');
		let mult = 1;
		if (s === 'млн' || s === 'm' || s === 'кк') mult = 1_000_000;
		else if (s === 'тыс' || s === 'к' || s === 'k') mult = 1000;
		return Math.round(n * mult);
	}

	// ───────────────── Должники ─────────────────

	private async startDebtors(chatId: number, fromId: number | undefined) {
		const user = await this.loadUser(fromId);
		if (!user) {
			await this.send(chatId, 'Вы не зарегистрированы в Bar Bot.');
			return;
		}
		if (user.bars.length === 0) {
			await this.send(chatId, 'К вашему аккаунту не привязан ни один бар.');
			return;
		}
		// Сессия нужна, чтобы работала кнопка «Добавить человека».
		const session = this.newSession(user);
		this.sessions.set(chatId, session);
		return this.showDebtorsList(chatId, session);
	}

	/** Показывает список клиентов с отрицательным балансом по доступным барам. */
	private async showDebtorsList(chatId: number, session: Session) {
		const bars = session.bars;
		const barIds = bars.map((b) => b.id);
		const debtors = await this.prisma.client.findMany({
			where: { barId: { in: barIds }, isActive: true, balance: { lt: 0 } },
			select: { name: true, balance: true, barId: true },
			orderBy: { balance: 'asc' },
		});

		const lines: string[] = ['📋 Должники'];
		if (debtors.length === 0) {
			lines.push('', 'Должников нет 🎉');
		} else {
			let total = 0;
			const multi = bars.length > 1;
			for (const bar of bars) {
				const list = debtors.filter((d) => d.barId === bar.id);
				if (list.length === 0) continue;
				if (multi) lines.push('', `🏠 ${bar.name}`);
				for (const d of list) {
					const debt = Math.abs(d.balance);
					total += debt;
					lines.push(`  • ${d.name} — ${this.money(debt)} сум`);
				}
			}
			lines.push('', `Итого долгов: ${this.money(total)} сум (${debtors.length} чел.)`);
		}

		await this.bot?.sendMessage(chatId, lines.join('\n'), {
			reply_markup: {
				inline_keyboard: [[{ text: '➕ Добавить человека', callback_data: `${CB}newclient` }]],
			},
		});
	}

	// ───────────────── Добавление человека (клиента) ─────────────────

	/** Запускает добавление человека с нуля (из меню/списка должников). */
	private async startAddClient(chatId: number, session: Session) {
		session.addingClient = true;
		session.newClient = {};
		session.flow = undefined;
		session.debtMode = false;
		this.touch(session);
		// Нужен бар: если один — берём сразу, иначе спрашиваем.
		if (!session.barId) {
			if (session.bars.length === 1) {
				session.barId = session.bars[0].id;
				session.barName = session.bars[0].name;
			} else {
				return this.askBar(chatId, session);
			}
		}
		return this.promptNewClientName(chatId, session);
	}

	/** Добавление человека для ненайденной строки долга (сохраняя черновик долгов). */
	private async startAddClientForDebt(chatId: number, session: Session, debtIndex: number) {
		if (!session.barId) {
			await this.send(chatId, 'Сначала выберите бар.');
			return;
		}
		session.addingClient = true;
		session.newClient = { debtIndex };
		this.touch(session);
		const raw = session.debtDraft?.[debtIndex]?.rawName;
		return this.promptNewClientName(chatId, session, raw);
	}

	private async promptNewClientName(chatId: number, session: Session, suggested?: string) {
		session.awaiting = 'newClientName';
		this.touch(session);
		const hint = suggested ? `\n\nПодсказка: можно отправить «${suggested}».` : '';
		await this.send(chatId, `➕ Добавление человека.\nБар: ${session.barName}\n\nВведите имя:${hint}`);
	}

	private async handleNewClientName(chatId: number, session: Session, text: string) {
		const name = text.trim();
		if (!name || name.length < 2) {
			await this.send(chatId, 'Имя слишком короткое. Введите имя человека:');
			return;
		}
		if (!session.newClient) session.newClient = {};
		session.newClient.name = name;
		session.awaiting = 'newClientPhone';
		this.touch(session);
		await this.send(chatId, 'Введите телефон (или отправьте «-», чтобы пропустить):');
	}

	private async handleNewClientPhone(chatId: number, session: Session, text: string) {
		const raw = text.trim();
		const skip = /^(-|нет|пропустить|skip)$/i.test(raw);
		const phone = skip ? undefined : raw;
		return this.finishAddClient(chatId, session, phone);
	}

	/** Создаёт клиента и, если запущено из долга, применяет отложенную запись. */
	private async finishAddClient(chatId: number, session: Session, phone?: string) {
		const nc = session.newClient;
		if (!session.barId || !nc?.name) {
			this.sessions.delete(chatId);
			await this.send(chatId, 'Что-то пошло не так. Начните заново через меню.');
			return;
		}

		let client: { id: string; name: string } | null = null;
		try {
			const created = await this.clientsService.create(session.userId, {
				barId: session.barId,
				name: nc.name,
				phone,
			});
			client = { id: created.id, name: created.name };
		} catch (e: any) {
			// Возможно, человек с таким именем уже есть — попробуем найти.
			const existing = await this.prisma.client.findUnique({
				where: { barId_name: { barId: session.barId, name: nc.name } },
				select: { id: true, name: true },
			});
			if (existing) {
				client = existing;
				await this.send(chatId, `Человек «${nc.name}» уже есть — использую его.`);
			} else {
				this.logger.warn('addClient error', e?.message || e);
				this.sessions.delete(chatId);
				await this.send(chatId, `Не удалось добавить человека: ${e?.message || 'ошибка'}`);
				return;
			}
		}

		session.addingClient = false;
		session.awaiting = null;

		// Если добавляли в рамках ввода долгов — привязываем к строке и продолжаем.
		if (nc.debtIndex != null && session.debtDraft?.[nc.debtIndex]) {
			const item = session.debtDraft[nc.debtIndex];
			item.clientId = client.id;
			item.clientName = client.name;
			item.balance = 0;
			item.status = 'ok';
			session.newClient = undefined;
			this.touch(session);
			await this.send(chatId, `✅ Добавлен: ${client.name}`);
			return this.resolveDebtNext(chatId, session);
		}

		session.newClient = undefined;
		this.sessions.delete(chatId);
		const phoneLine = phone ? `\nТелефон: ${phone}` : '';
		await this.send(chatId, `✅ Человек добавлен.\nБар: ${session.barName}\nИмя: ${client.name}${phoneLine}`);
	}

	/** Подпись баланса: долг (−) / депозит (+) / 0. */
	private balanceLabel(balance: number): string {
		if (balance < -0.001) return `долг ${this.money(Math.abs(balance))}`;
		if (balance > 0.001) return `депозит ${this.money(balance)}`;
		return '0';
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

		// Добавление человека: после выбора бара спрашиваем имя.
		if (session.addingClient) {
			return this.promptNewClientName(chatId, session);
		}

		// Сценарий долгов: после выбора бара просим список.
		if (session.debtMode) {
			return this.promptDebts(chatId, session);
		}

		// Сценарии закупа/спортпита: после выбора бара просим список.
		if (session.flow) {
			return this.promptItems(chatId, session);
		}

		const action = session.pendingAction;

		if (action === 'view') {
			// Открываем сразу сегодняшний день; дальше — стрелками ◀️/▶️.
			if (!session.dayChosen) {
				session.selectedDate = this.today();
				session.dayChosen = true;
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

		// Возвращаем на экран записей за этот день (с навигацией).
		session.pendingAction = 'view';
		await this.showDaySummary(chatId, session);
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

		// Возвращаем на экран записей за этот день (с навигацией).
		session.pendingAction = 'view';
		await this.showDaySummary(chatId, session);
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

		const header = `Бар: ${session.barName}\nДата: ${this.fmtRu(session.selectedDate)} (${this.navLabel(session.selectedDate)})`;

		if (!revenue && expenses.length === 0) {
			await this.sendDayView(
				chatId,
				session,
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

		await this.sendDayView(chatId, session, lines.join('\n'));
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
			[{ text: BTN_PURCHASE }],
			[{ text: BTN_SP_ARRIVAL }, { text: BTN_SP_SALE }],
			[{ text: BTN_DEBT }, { text: BTN_DEBTORS }],
		];
		if (role === RoleType.ADMIN || role === RoleType.MANAGER) {
			rows.push([{ text: BTN_MONTH }]);
		}
		if (this.config.get<string>('DESKTOP_URL')) {
			rows.push([{ text: BTN_DESKTOP }]);
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

	/** Экран записей за день: навигация по дням + кнопки ввода. */
	private async sendDayView(chatId: number, session: Session, text: string) {
		const cur = session.selectedDate;
		const prev = this.addDays(cur, -1);
		const next = this.addDays(cur, 1);
		const today = this.today();

		const navRow: TelegramBot.InlineKeyboardButton[] = [
			{ text: `◀️ ${this.navLabel(prev)}`, callback_data: `${CB}nav:${prev}` },
		];
		// Вперёд — не дальше сегодняшнего дня
		if (cur < today) {
			navRow.push({ text: `${this.navLabel(next)} ▶️`, callback_data: `${CB}nav:${next}` });
		}

		await this.bot?.sendMessage(chatId, text, {
			reply_markup: {
				inline_keyboard: [
					navRow,
					[
						{ text: '💵 Внести наличку', callback_data: `${CB}add:cash` },
						{ text: '💳 Внести карту', callback_data: `${CB}add:card` },
					],
					[{ text: '🧾 Внести расход', callback_data: `${CB}add:exp` }],
					[{ text: '📅 Выбрать дату', callback_data: `${CB}manual` }],
				],
			},
		});
	}

	private async send(chatId: number, text: string) {
		await this.bot?.sendMessage(chatId, text);
	}

	/** Отправляет ссылку на десктопную версию (URL из DESKTOP_URL). */
	private async sendDesktopLink(chatId: number) {
		const url = this.config.get<string>('DESKTOP_URL');
		if (!url) {
			await this.send(chatId, 'Ссылка на десктоп не настроена. Задайте DESKTOP_URL в переменных окружения.');
			return;
		}
		await this.bot?.sendMessage(chatId, 'Десктопная версия:', {
			reply_markup: {
				inline_keyboard: [[{ text: '💻 Открыть десктоп', url }]],
			},
		});
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

	/** Сдвигает дату yyyy-MM-dd на delta дней. */
	private addDays(ymd: string, delta: number): string {
		const d = this.toUtc(ymd);
		d.setUTCDate(d.getUTCDate() + delta);
		return d.toISOString().slice(0, 10);
	}

	/** Короткая метка дня для кнопок: Сегодня / Вчера / dd.MM. */
	private navLabel(ymd: string): string {
		const today = this.today();
		const [, m, d] = ymd.split('-');
		if (ymd === today) return 'Сегодня';
		if (ymd === this.addDays(today, -1)) return 'Вчера';
		return `${d}.${m}`;
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
