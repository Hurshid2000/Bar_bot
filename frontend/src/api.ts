// API конфигурация
const API_URL = import.meta.env.VITE_API || 'http://localhost:3000';

export interface AuthResponse {
	accessToken: string;
	user: {
		id: string;
		telegramId: string;
		name: string;
		role: string;
	};
}

// Авторизация через Telegram
export async function authenticateWithTelegram(initData: string): Promise<AuthResponse> {
	const response = await fetch(`${API_URL}/auth/telegram`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ initData }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Ошибка авторизации');
	}

	return response.json();
}

// Проверка здоровья API
export async function checkHealth(): Promise<{ status: string; database: string }> {
	const response = await fetch(`${API_URL}/health`);
	return response.json();
}

// Сохранение токена в localStorage
export function saveToken(token: string): void {
	localStorage.setItem('accessToken', token);
}

// Получение токена из localStorage
export function getToken(): string | null {
	return localStorage.getItem('accessToken');
}

// Удаление токена
export function removeToken(): void {
	localStorage.removeItem('accessToken');
}

// Создание заголовков с авторизацией
export function getAuthHeaders(): HeadersInit {
	const token = getToken();
	return {
		'Content-Type': 'application/json',
		...(token && { Authorization: `Bearer ${token}` }),
	};
}
