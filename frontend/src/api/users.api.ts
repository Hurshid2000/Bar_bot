import { apiGet, apiPatch, apiDelete, apiPost } from './client';
import type { User } from '../types/common.types';

export interface UpdateUserDto {
	name?: string;
	role?: string;
}

export const usersApi = {
	getAll: (): Promise<User[]> => apiGet<User[]>('/users'),

	getById: (id: string): Promise<User> => apiGet<User>(`/users/${id}`),

	update: (id: string, data: UpdateUserDto): Promise<User> =>
		apiPatch<User>(`/users/${id}`, data),

	delete: (id: string): Promise<void> => apiDelete<void>(`/users/${id}`),

	assignBar: (userId: string, barId: string): Promise<void> =>
		apiPost<void>(`/users/${userId}/bars`, { barId }),

	removeBar: (userId: string, barId: string): Promise<void> =>
		apiDelete<void>(`/users/${userId}/bars/${barId}`),

	getUserBars: (userId: string): Promise<any[]> =>
		apiGet<any[]>(`/users/${userId}/bars`),
};
