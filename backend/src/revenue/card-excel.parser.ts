import * as ExcelJS from 'exceljs';

/** Строка "Итого за 05.02.2026: Поступление: 840 000 Расход: 0.00" → дата и сумма поступлений */
const TOTAL_ROW_REGEX = /Итого\s+за\s+(\d{2}\.\d{2}\.\d{4})\s*:\s*Поступление\s*:\s*([\d\s]+)/i;

export interface DailyCardRow {
	/** Дата в формате YYYY-MM-DD */
	date: string;
	/** Сумма поступлений (число) */
	amount: number;
}

/**
 * Парсит Excel (xlsx): ищет ячейки с текстом "Итого за DD.MM.YYYY: Поступление: X XXX",
 * возвращает массив { date (YYYY-MM-DD), amount }.
 */
export async function parseCardTotalsFromExcel(buffer: Buffer): Promise<DailyCardRow[]> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer as any);

	const result: DailyCardRow[] = [];
	const seen = new Set<string>();

	for (const sheet of workbook.worksheets) {
		sheet.eachRow((row, rowNumber) => {
			row.eachCell((cell, colNumber) => {
				const value = cell.value;
				const text = value == null ? '' : String(value).trim();
				const match = text.match(TOTAL_ROW_REGEX);
				if (!match) return;

				const [, dateStr, amountStr] = match;
				const dateNorm = dateDdMmYyyyToYyyyMmDd(dateStr);
				const amount = parseAmount(amountStr);
				if (!dateNorm || amount === undefined || amount < 0) return;
				if (seen.has(dateNorm)) return;
				seen.add(dateNorm);

				result.push({ date: dateNorm, amount });
			});
		});
	}

	result.sort((a, b) => a.date.localeCompare(b.date));
	return result;
}

function dateDdMmYyyyToYyyyMmDd(ddMmYyyy: string): string | null {
	const m = ddMmYyyy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
	if (!m) return null;
	const [, d, mo, y] = m;
	return `${y}-${mo}-${d}`;
}

function parseAmount(str: string): number | undefined {
	const cleaned = str.replace(/\s/g, '');
	const num = parseInt(cleaned, 10);
	return isNaN(num) ? undefined : num;
}
