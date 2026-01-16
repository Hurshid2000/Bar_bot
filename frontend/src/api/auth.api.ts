import { apiPost } from './client';
import type { AuthResponse, HealthResponse } from '../types/api.types';

const TOKEN_KEY = 'accessToken';

export async function authenticateWithTelegram(
	initData: string,
): Promise<AuthResponse> {
	return apiPost<AuthResponse>('/auth/telegram', { initData });
}

export async function checkHealth(): Promise<HealthResponse> {
	const response = await fetch(
		`${import.meta.env.VITE_API || 'http://localhost:3000'}/health`,
	);
	return response.json();
}

export function saveToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
	localStorage.removeItem(TOKEN_KEY);
}
