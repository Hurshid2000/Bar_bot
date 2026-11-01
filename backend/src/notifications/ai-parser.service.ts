import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/** Разобранная строка списка (совпадает с формой эвристического парсера). */
export interface ParsedLine {
	name: string;
	quantity: number;
	price?: number;
	buyer?: string;
	note?: string;
}

export type ParseFlow = 'purchase' | 'sp_arrival' | 'sp_sale';

/** Разобранная запись долга/оплаты из свободного текста. */
export interface ParsedDebt {
	/** Имя человека. */
	name: string;
	/** Сумма в сумах, положительное целое. */
	amount: number;
	/** Тип операции: новый долг или возврат (оплата). */
	type: 'debt' | 'payment';
	/** Комментарий/за что (необязательно). */
	comment?: string;
}

/**
 * Разбор свободного текста списка товаров через Claude.
 * Если ключ ANTHROPIC_API_KEY не задан или запрос не удался — возвращает null,
 * и вызывающий код откатывается на эвристический парсер.
 */
@Injectable()
export class AiParserService {
	private readonly logger = new Logger(AiParserService.name);
	private client: Anthropic | null = null;
	private readonly model: string;

	constructor(private config: ConfigService) {
		const apiKey = config.get<string>('ANTHROPIC_API_KEY');
		this.model = config.get<string>('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001';
		if (apiKey) {
			try {
				this.client = new Anthropic({ apiKey });
				this.logger.log(`AI parser enabled (model ${this.model})`);
			} catch (e: any) {
				this.logger.warn(`Failed to init Anthropic client: ${e?.message || e}`);
				this.client = null;
			}
		} else {
			this.logger.log('AI parser disabled (ANTHROPIC_API_KEY not set) — используется эвристика');
		}
	}

	get enabled(): boolean {
		return !!this.client;
	}

	async parseItems(text: string, flow: ParseFlow): Promise<ParsedLine[] | null> {
		if (!this.client) return null;

		const wantsPrice = flow === 'sp_sale';
		const shape = wantsPrice
			? '{"name": string, "quantity": integer>=1, "price": number (цена за единицу в сумах, целое), "buyer": string|null (имя покупателя)}'
			: '{"name": string, "quantity": integer>=1}';
		const system = [
			'Ты извлекаешь позиции из сообщения работника бара (закуп/приход/продажа).',
			'Верни СТРОГО JSON-массив объектов вида ' + shape + '.',
			'Никакого текста вне JSON. Если позицию нельзя понять — пропусти её.',
			'name — короткое название товара без количества и цены.',
			wantsPrice
				? 'Если цена не указана — не включай эту позицию.'
				: 'Количество приводи к целому числу.',
		].join(' ');

		try {
			const msg = await this.client.messages.create({
				model: this.model,
				max_tokens: 1024,
				system,
				messages: [{ role: 'user', content: text }],
			});
			const block = msg.content.find((c) => c.type === 'text');
			const raw = block && 'text' in block ? block.text : '';
			const arr = this.extractJsonArray(raw);
			if (!Array.isArray(arr)) return null;

			const items: ParsedLine[] = [];
			for (const el of arr) {
				if (!el || typeof el.name !== 'string') continue;
				const quantity = Math.round(Number(el.quantity));
				if (!Number.isFinite(quantity) || quantity < 1) continue;
				const line: ParsedLine = { name: el.name.trim(), quantity };
				if (wantsPrice) {
					const price = Number(el.price);
					if (!Number.isFinite(price) || price <= 0) continue;
					line.price = price;
					if (el.buyer && typeof el.buyer === 'string') line.buyer = el.buyer.trim();
				}
				items.push(line);
			}
			return items.length > 0 ? items : null;
		} catch (e: any) {
			this.logger.warn(`AI parse failed, fallback to heuristic: ${e?.message || e}`);
			return null;
		}
	}

	/**
	 * Разбор свободного текста о долгах клиентов через Claude.
	 * Возвращает список записей или null (тогда вызывающий код откатывается на эвристику).
	 */
	async parseDebts(text: string): Promise<ParsedDebt[] | null> {
		if (!this.client) return null;

		const system = [
			'Ты извлекаешь записи о долгах клиентов бара из сообщения работника.',
			'Верни СТРОГО JSON-массив объектов вида',
			'{"name": string, "amount": integer>=1 (сумма в сумах), "type": "debt"|"payment", "comment": string|null}.',
			'Никакого текста вне JSON. Если запись нельзя понять — пропусти её.',
			'name — имя человека без суммы и лишних слов.',
			'amount — целое число в сумах. Раскрывай сокращения: "к"/"k"/"тыс" = тысячи (50к = 50000), "млн"/"кк" = миллионы (1.5млн = 1500000).',
			'type — "payment" если человек вернул/отдал/погасил/заплатил/оплатил/внёс деньги; иначе "debt" (взял в долг, должен, записать долг).',
			'comment — за что долг (например "пиво", "кальян"), если указано; иначе null.',
		].join(' ');

		try {
			const msg = await this.client.messages.create({
				model: this.model,
				max_tokens: 1024,
				system,
				messages: [{ role: 'user', content: text }],
			});
			const block = msg.content.find((c) => c.type === 'text');
			const raw = block && 'text' in block ? block.text : '';
			const arr = this.extractJsonArray(raw);
			if (!Array.isArray(arr)) return null;

			const debts: ParsedDebt[] = [];
			for (const el of arr) {
				if (!el || typeof el.name !== 'string') continue;
				const amount = Math.round(Number(el.amount));
				if (!Number.isFinite(amount) || amount < 1) continue;
				const type: 'debt' | 'payment' = el.type === 'payment' ? 'payment' : 'debt';
				const debt: ParsedDebt = { name: el.name.trim(), amount, type };
				if (el.comment && typeof el.comment === 'string') {
					const c = el.comment.trim();
					if (c) debt.comment = c;
				}
				if (debt.name) debts.push(debt);
			}
			return debts.length > 0 ? debts : null;
		} catch (e: any) {
			this.logger.warn(`AI debt parse failed, fallback to heuristic: ${e?.message || e}`);
			return null;
		}
	}

	private extractJsonArray(raw: string): unknown {
		const m = raw.match(/\[[\s\S]*\]/);
		if (!m) return null;
		try {
			return JSON.parse(m[0]);
		} catch {
			return null;
		}
	}
}
