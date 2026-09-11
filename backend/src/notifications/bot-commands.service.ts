import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PurchasesService } from '../purchases/purchases.service';
import { SalesService } from '../sales/sales.service';
import { ArrivalsService } from '../arrivals/arrivals.service';
import * as TelegramBot from 'node-telegram-bot-api';
import { RoleType, ProductType, ArrivalType } from '@prisma/client';

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
const BTN_OTHER_DAY = '📅 Другой день';
const BTN_MONTH = '📊 Сводка за месяц';
const BTN_PURCHASE = '📦 Закуп';
const BTN_SP_ARRIVAL = '🏋️ Приход спортпита';
const BTN_SP_SALE = '🛒 Продажа спортпита';

type FlowAction = 'cash' | 'card' | 'exp' | 'view';
/** Сценарии закупа/спортпита. */
type ProcFlow = 'purchase' | 'sp_arrival' | 'sp_sale';
type Awaiting = 'amount' | 'expense' | 'manualDate' | 'items' | null;

interface AccessBar {
	id: string;
	name: string;
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
	candidates?: AccessBar[];
	status: 'ok' | 'ambiguous' | 'notfound' | 'skip';
	/** Причина, если позицию нельзя записать. */
	note?: string;
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

		const parsed =
			session.flow === 'sp_sale' ? this.parseSaleLines(text) : this.parseNameQty(text);

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
				buttons.push([{ text: c.name, callback_data: `${CB}pick:${idx}:${c.id}` }]);
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
		const include = {
			barProducts: { where: { barId, isActive: true }, select: { price: true } },
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
			return { status: 'ok', productId: p.id, productName: p.name, price: this.sellPrice(p) };
		}
		return {
			status: 'ambiguous',
			candidates: products.slice(0, MAX_CANDIDATES).map((p) => ({ id: p.id, name: p.name })),
		};
	}

	private sellPrice(p: {
		defaultPrice: number | null;
		barProducts?: { price: number }[];
	}): number {
		return p.barProducts?.[0]?.price ?? p.defaultPrice ?? 0;
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

		// Сценарии закупа/спортпита: после выбора бара просим список.
		if (session.flow) {
			return this.promptItems(chatId, session);
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
			[{ text: BTN_PURCHASE }],
			[{ text: BTN_SP_ARRIVAL }, { text: BTN_SP_SALE }],
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
