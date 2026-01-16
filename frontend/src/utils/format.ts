import { format, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}

export function formatDate(date: string | Date, pattern = 'dd.MM.yyyy'): string {
	const dateObj = typeof date === 'string' ? parseISO(date) : date;
	return format(dateObj, pattern);
}

export function formatDateTime(
	date: string | Date,
	pattern = 'dd.MM.yyyy HH:mm',
): string {
	const dateObj = typeof date === 'string' ? parseISO(date) : date;
	return format(dateObj, pattern);
}

export function formatNumber(value: number, decimals = 2): string {
	return new Intl.NumberFormat('ru-RU', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value);
}
