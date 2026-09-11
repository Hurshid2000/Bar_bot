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
