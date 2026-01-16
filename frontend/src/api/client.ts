import { getToken, removeToken } from './auth.api';

const API_URL = import.meta.env.VITE_API || 'http://localhost:3000';

export class ApiError extends Error {
	statusCode: number;
	data?: any;

	constructor(statusCode: number, message: string, data?: any) {
		super(message);
		this.name = 'ApiError';
		this.statusCode = statusCode;
		this.data = data;
	}
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({
			message: response.statusText,
		}));

		// Если 401, удаляем токен
		if (response.status === 401) {
			removeToken();
		}

		throw new ApiError(
			response.status,
			errorData.message || response.statusText,
			errorData,
		);
	}

	return response.json();
}

export async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const token = getToken();

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		...(token && { Authorization: `Bearer ${token}` }),
		...options.headers,
	};

	const response = await fetch(`${API_URL}${endpoint}`, {
		...options,
		headers,
	});

	return handleResponse<T>(response);
}

export async function apiGet<T>(endpoint: string): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'GET' });
}

export async function apiPost<T>(
	endpoint: string,
	data?: any,
): Promise<T> {
	return apiRequest<T>(endpoint, {
		method: 'POST',
		body: data ? JSON.stringify(data) : undefined,
	});
}

export async function apiPatch<T>(
	endpoint: string,
	data?: any,
): Promise<T> {
	return apiRequest<T>(endpoint, {
		method: 'PATCH',
		body: data ? JSON.stringify(data) : undefined,
	});
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'DELETE' });
}
