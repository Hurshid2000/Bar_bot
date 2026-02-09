import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Bar } from '../types/common.types';

export interface CreateBarDto {
	name: string;
	isActive?: boolean;
}

export interface UpdateBarDto {
	name?: string;
	isActive?: boolean;
}

export const barsApi = {
	getAll: (): Promise<Bar[]> => apiGet<Bar[]>('/bars'),

	getById: (id: string): Promise<Bar> => apiGet<Bar>(`/bars/${id}`),

	create: (data: CreateBarDto): Promise<Bar> =>
		apiPost<Bar>('/bars', data),

	update: (id: string, data: UpdateBarDto): Promise<Bar> =>
		apiPatch<Bar>(`/bars/${id}`, data),

	delete: (id: string): Promise<void> =>
		apiDelete<void>(`/bars/${id}`),
};
