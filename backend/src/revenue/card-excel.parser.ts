import * as ExcelJS from 'exceljs';

/** Основной: "Итого за 12.02.2026: Поступление: 1 030 024.5 Расход: ..." (может быть в одной или нескольких ячейках) */
const TOTAL_ROW_REGEX = /Итого\s+за\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*:?\s*Поступление\s*:?\s*([\d\s.,]+?)(?=\s*Расход|$)/i;
/** Запасной: дата и сумма в одной строке, но в любом порядке */
const DATE_REGEX = /Итого\s+за\s+(\d{1,2}\.\d{1,2}\.\d{4})/i;
const AMOUNT_REGEX = /Поступление\s*:?\s*([\d\s.,]+?)(?=\s*Расход|$)/i;

// Дата в ячейке: DD.MM.YYYY (UzCard) или DD-MM-YYYY (выписка приложения)
const DATE_CELL_REGEX = /^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/;
// Тип операции, означающий поступление на карту
const INCOME_TYPES = new Set(['приход', 'поступление']);

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
	if (v && v.result != null) return String(v.result);
	return '';
}

/**
 * Парсит Excel с поступлениями на карту за день.
 *
 * Поддерживает два формата:
 *  1. Выписка по карте (список транзакций): колонки «Дата», «Сумма», «Тип платежа».
 *     Поступление за день = сумма всех транзакций с типом «Приход».
 *  2. Старый формат с готовыми строками «Итого за DD.MM.YYYY: Поступление: X XXX».
 *
 * Сначала пробуем формат выписки; если он не распознан — старый формат.
 */
export async function parseCardTotalsFromExcel(buffer: Buffer): Promise<DailyCardRow[]> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer as any);

	// 1. Формат «список транзакций»
	const fromTransactions = parseTransactionStatement(workbook);
	if (fromTransactions.length > 0) return fromTransactions;

	// 2. Старый формат «Итого за … Поступление: …»
	return parseLegacyTotals(workbook);
}

/**
 * Формат выписки по карте: суммируем транзакции с типом «Приход» по дням.
 */
function parseTransactionStatement(workbook: ExcelJS.Workbook): DailyCardRow[] {
	const byDay = new Map<string, number>();

	for (const sheet of workbook.worksheets) {
		const cols = detectColumns(sheet);
		if (!cols) continue;

		sheet.eachRow({ includeEmpty: false }, (row) => {
			const type = getCellText(row.getCell(cols.typeCol).value).trim().toLowerCase();
			if (!INCOME_TYPES.has(type)) return; // расход/списание/итого/заголовки пропускаем

			const dateNorm = dateDdMmYyyyToYyyyMmDd(getCellText(row.getCell(cols.dateCol).value).trim());
			if (!dateNorm) return;

			const amount = parseAmountCell(row.getCell(cols.amountCol).value);
			if (amount === undefined || amount <= 0) return;

			byDay.set(dateNorm, (byDay.get(dateNorm) ?? 0) + amount);
		});
	}

	return Array.from(byDay.entries())
		.map(([date, amount]) => ({ date, amount }))
		.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Ищет строку-заголовок таблицы транзакций и возвращает номера нужных колонок.
 * Заголовок содержит ячейки «Дата», «Сумма», «Тип платежа».
 */
function detectColumns(
	sheet: ExcelJS.Worksheet,
): { dateCol: number; amountCol: number; typeCol: number } | null {
	let found: { dateCol: number; amountCol: number; typeCol: number } | null = null;

	sheet.eachRow({ includeEmpty: false }, (row) => {
		if (found) return;
		let dateCol = 0;
		let amountCol = 0;
		let typeCol = 0;
		row.eachCell({ includeEmpty: false }, (cell) => {
			const t = getCellText(cell.value).trim().toLowerCase();
			// UzCard: «Дата» / «Сумма» / «Тип платежа»
			// Выписка приложения: «Дата платежа» / «Сумма платежа» / «Тип операции»
			if (t === 'дата' || t === 'дата платежа') dateCol = Number(cell.col);
			else if (t === 'сумма' || t === 'сумма платежа') amountCol = Number(cell.col);
			else if (t === 'тип платежа' || t === 'тип операции') typeCol = Number(cell.col);
		});
		if (dateCol && amountCol && typeCol) {
			found = { dateCol, amountCol, typeCol };
		}
	});

	return found;
}

/**
 * Старый формат: строки «Итого за DD.MM.YYYY: Поступление: X XXX».
 * Проверяет целую строку (ячейки могут быть в разных столбцах).
 */
function parseLegacyTotals(workbook: ExcelJS.Workbook): DailyCardRow[] {
	const result: DailyCardRow[] = [];
	const seen = new Set<string>();

	for (const sheet of workbook.worksheets) {
		sheet.eachRow((row) => {
			const rowTexts: string[] = [];
			row.eachCell({ includeEmpty: false }, (cell) => {
				rowTexts.push(getCellText(cell.value).trim());
			});
			const rowText = rowTexts.join(' ');
			let dateStr: string | null = null;
			let amountStr: string | null = null;

			const mainMatch = rowText.match(TOTAL_ROW_REGEX);
			if (mainMatch) {
				[, dateStr, amountStr] = mainMatch;
			} else {
				const dateMatch = rowText.match(DATE_REGEX);
				const amountMatch = rowText.match(AMOUNT_REGEX);
				if (dateMatch && amountMatch) {
					dateStr = dateMatch[1];
					amountStr = amountMatch[1];
				}
			}
			if (!dateStr || !amountStr) return;

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

/**
 * Читает денежную сумму из ячейки БЕЗ «датовой» эвристики getCellText:
 * числовые ячейки берём как есть (иначе число вроде 10000 будет ошибочно
 * истолковано как серийная дата Excel).
 */
function parseAmountCell(value: ExcelJS.CellValue): number | undefined {
	if (typeof value === 'number') return value;
	if (value instanceof Date) return undefined; // сумма не может быть датой
	if (value && typeof value === 'object') {
		const v = value as unknown as Record<string, unknown>;
		if (typeof v.result === 'number') return v.result; // формула с числовым результатом
	}
	return parseAmount(getCellText(value));
}

function dateDdMmYyyyToYyyyMmDd(ddMmYyyy: string): string | null {
	const m = ddMmYyyy.match(DATE_CELL_REGEX);
	if (!m) return null;
	const [, d, mo, y] = m;
	const day = Number(d);
	const month = Number(mo);
	if (day < 1 || day > 31 || month < 1 || month > 12) return null;
	const pad = (s: string) => s.padStart(2, '0');
	return `${y}-${pad(mo)}-${pad(d)}`;
}

/**
 * Разбирает денежную сумму.
 * Пробелы — разделители тысяч; запятые/точки как разделители тысяч убираются,
 * последний разделитель считается десятичным, если после него 1–2 цифры.
 */
function parseAmount(str: string): number | undefined {
	let s = str.replace(/\s/g, '');
	if (!s) return undefined;

	// Позиция последнего разделителя (точка или запятая)
	const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
	if (lastSep >= 0) {
		const decimals = s.length - lastSep - 1;
		if (decimals >= 1 && decimals <= 2) {
			// Считаем последний разделитель десятичным, остальные — тысячные
			const intPart = s.slice(0, lastSep).replace(/[.,]/g, '');
			const fracPart = s.slice(lastSep + 1);
			s = `${intPart}.${fracPart}`;
		} else {
			// Все разделители — тысячные
			s = s.replace(/[.,]/g, '');
		}
	}

	const num = parseFloat(s);
	return isNaN(num) ? undefined : num;
}
