import * as crypto from 'crypto';

interface ParsedInitData {
	hash: string;
	dataCheckString: string;
	user?: {
		id: string;
		first_name: string;
		last_name?: string;
		username?: string;
		photo_url?: string;
	};
}

/**
 * Парсит initData строку от Telegram Mini App
 * @param initData - строка вида "query_id=...&user=...&hash=..."
 * @returns объект с hash, dataCheckString и данными пользователя
 */
export function parseInitData(initData: string): ParsedInitData {
	const params = new URLSearchParams(initData);
	const hash = params.get('hash');

	if (!hash) {
		throw new Error('Hash not found in initData');
	}

	// Удаляем hash из параметров для создания data_check_string
	params.delete('hash');

	// Сортируем параметры по ключу и создаем data_check_string
	const sortedParams = Array.from(params.entries()).sort(([a], [b]) =>
		a.localeCompare(b),
	);
	const dataCheckString = sortedParams
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	// Парсим user если есть
	let user;
	const userParam = params.get('user');
	if (userParam) {
		try {
			user = JSON.parse(decodeURIComponent(userParam));
		} catch (error) {
			throw new Error('Invalid user data in initData');
		}
	}

	return {
		hash,
		dataCheckString,
		user,
	};
}

/**
 * Проверяет подпись Telegram initData
 * @param initData - строка initData от Telegram
 * @param botToken - токен бота из BOT_TOKEN
 * @returns true если подпись валидна
 */
export function verifyTelegramSignature(
	initData: string,
	botToken: string,
): boolean {
	try {
		const { hash, dataCheckString } = parseInitData(initData);

		// Вычисляем secret = SHA256(BOT_TOKEN)
		const secret = crypto
			.createHash('sha256')
			.update(botToken)
			.digest();

		// Вычисляем HMAC SHA256(secret, data_check_string)
		const calculatedHash = crypto
			.createHmac('sha256', secret)
			.update(dataCheckString)
			.digest('hex');

		// Сравниваем хеши
		return calculatedHash === hash;
	} catch (error) {
		return false;
	}
}
