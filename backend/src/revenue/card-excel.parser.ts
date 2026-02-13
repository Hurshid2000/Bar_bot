import * as ExcelJS from 'exceljs';

/** "Итого за 05.02.2026: Поступление: 840 000" — дата 1–2 цифры, месяц 1–2 цифры (разбивка по ячейкам ок) */
const TOTAL_ROW_REGEX = /Итого\s+за\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*:?\s*Поступление\s*:?\s*([\d\s]+)/i;

export interface DailyCardRow {
	date: string;
	amount: number;
}

function getCellText(value: ExcelJS.CellValue): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number') {
		// Excel хранит даты как число (сериальный номер)
		if (value >= 1 && value < 2958466) {
			const d = new Date((value - 25569) * 86400 * 1000);
			if (!isNaN(d.getTime())) {
				const day = d.getUTCDate().toString().padStart(2, '0');
				const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
				return `${day}.${month}.${d.getUTCFullYear()}`;
			}
		}
		return String(value);
	}
	if (value instanceof Date) {
		const d = value;
		const day = d.getDate().toString().padStart(2, '0');
		const month = (d.getMonth() + 1).toString().padStart(2, '0');
		return `${day}.${month}.${d.getFullYear()}`;
	}
	if (typeof value === 'boolean') return String(value);
	const v = value as unknown as Record<string, unknown>;
	if (v && Array.isArray(v.richText)) {
		return (v.richText as Array<{ text?: string }>).map((t) => t.text || '').join('');
	}
	if (v && typeof v.text === 'string') return v.text;
	return String(value);
}

/**
 * Парсит Excel: ищет строки "Итого за DD.MM.YYYY: Поступление: X XXX".
 * Проверяет целую строку (ячейки могут быть в разных столбцах).
 */
export async function parseCardTotalsFromExcel(buffer: Buffer): Promise<DailyCardRow[]> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer as any);

	const result: DailyCardRow[] = [];
	const seen = new Set<string>();

	for (const sheet of workbook.worksheets) {
		sheet.eachRow((row) => {
			const rowTexts: string[] = [];
			row.eachCell({ includeEmpty: false }, (cell) => {
				rowTexts.push(getCellText(cell.value).trim());
			});
			const rowText = rowTexts.join(' ');
			const match = rowText.match(TOTAL_ROW_REGEX);
			if (!match) return;

			const [, dateStr, amountStr] = match;
			const dateNorm = dateDdMmYyyyToYyyyMmDd(dateStr);
			const amount = parseAmount(amountStr);
			if (!dateNorm || amount === undefined || amount < 0) return;
			if (seen.has(dateNorm)) return;
			seen.add(dateNorm);

			result.push({ date: dateNorm, amount });
		});
	}

	result.sort((a, b) => a.date.localeCompare(b.date));
	return result;
}

function dateDdMmYyyyToYyyyMmDd(ddMmYyyy: string): string | null {
	const m = ddMmYyyy.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
	if (!m) return null;
	const [, d, mo, y] = m;
	const pad = (s: string) => s.padStart(2, '0');
	return `${y}-${pad(mo)}-${pad(d)}`;
}

function parseAmount(str: string): number | undefined {
	const cleaned = str.replace(/\s/g, '');
	const num = parseInt(cleaned, 10);
	return isNaN(num) ? undefined : num;
}
