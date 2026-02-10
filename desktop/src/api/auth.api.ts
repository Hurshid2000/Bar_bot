import { apiPost, apiPatch } from './client';
import type { AuthResponse, HealthResponse } from '../types/api.types';

const TOKEN_KEY = 'accessToken';
const SESSION_START_KEY = 'sessionStart';

export async function authenticateWithPin(
	telegramId: string,
	pin: string,
): Promise<AuthResponse> {
	return apiPost<AuthResponse>('/auth/pin', { telegramId, pin });
}

export async function setPin(pin: string): Promise<{ message: string }> {
	return apiPatch<{ message: string }>('/auth/pin', { pin });
}

export async function checkHealth(): Promise<HealthResponse> {
	const response = await fetch(
		`${import.meta.env.VITE_API || 'http://localhost:3000'}/health`,
	);
	return response.json();
}

export function saveToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(SESSION_START_KEY, Date.now().toString());
}

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function getSessionStart(): number | null {
	const val = localStorage.getItem(SESSION_START_KEY);
	return val ? parseInt(val, 10) : null;
}

export function removeToken(): void {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(SESSION_START_KEY);
}
