import * as crypto from 'crypto';

interface ParsedInitData {
	hash: string;
	dataCheckString: string;
	authDate?: number;
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

	// Парсим auth_date если есть
	const authDateParam = params.get('auth_date');
	const authDate = authDateParam ? parseInt(authDateParam, 10) : undefined;

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
		authDate,
		user,
	};
}

/**
 * Проверяет, что auth_date не старше указанного времени (защита от replay-атак)
 * @param authDate - timestamp из initData
 * @param maxAgeSeconds - максимальный возраст данных в секундах (по умолчанию 86400 = 24 часа)
 * @returns true если auth_date валиден
 */
export function verifyAuthDate(
	authDate?: number,
	maxAgeSeconds = 86400,
): boolean {
	if (!authDate) {
		return false;
	}

	const currentTime = Math.floor(Date.now() / 1000);
	const age = currentTime - authDate;

	if (age < 0) {
		// auth_date в будущем - подозрительно
		return false;
	}

	if (age > maxAgeSeconds) {
		// auth_date слишком старый
		return false;
	}

	return true;
}

/**
 * Проверяет подпись Telegram initData
 * Согласно документации Telegram:
 * 1. secret = HMAC_SHA256(key="WebAppData", message=botToken)
 * 2. calculatedHash = HMAC_SHA256(key=secret, message=dataCheckString)
 * 
 * @param initData - строка initData от Telegram
 * @param botToken - токен бота из BOT_TOKEN
 * @param enableLogging - включить детальное логирование
 * @returns true если подпись валидна
 */
export function verifyTelegramSignature(
	initData: string,
	botToken: string,
	enableLogging = false,
): boolean {
	try {
		const { hash, dataCheckString } = parseInitData(initData);

		// Шаг 1: Вычисляем secret = HMAC_SHA256(key="WebAppData", message=botToken)
		// Это правильный алгоритм согласно документации Telegram
		const secret = crypto
			.createHmac('sha256', 'WebAppData')
			.update(botToken)
			.digest();

		// Шаг 2: Вычисляем HMAC SHA256(secret, data_check_string)
		const calculatedHash = crypto
			.createHmac('sha256', secret)
			.update(dataCheckString)
			.digest('hex');

		// Логирование для отладки
		if (enableLogging || process.env.NODE_ENV === 'development') {
			console.log('🔍 Отладка проверки подписи Telegram:');
			console.log(`  Hash из initData: ${hash}`);
			console.log(`  Вычисленный hash: ${calculatedHash}`);
			console.log(`  Data check string (первые 100 символов): ${dataCheckString.substring(0, 100)}...`);
			console.log(`  Data check string (полная длина): ${dataCheckString.length} символов`);
			console.log(`  Совпадение: ${calculatedHash === hash}`);
			if (calculatedHash !== hash) {
				console.log(`  ❌ Хеши не совпадают!`);
				console.log(`  Ожидалось: ${hash}`);
				console.log(`  Получено:  ${calculatedHash}`);
			}
		}

		// Сравниваем хеши
		return calculatedHash === hash;
	} catch (error) {
		if (enableLogging || process.env.NODE_ENV === 'development') {
			console.error('❌ Ошибка при проверке подписи:', error);
		}
		return false;
	}
}
