import type { User } from './common.types';

export interface AuthResponse {
	accessToken: string;
	user: User;
}

export interface ApiError {
	message: string;
	statusCode: number;
	error?: string;
}

export interface HealthResponse {
	status: string;
	database: string;
}
