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

export interface BarMonthlyStats {
	barId: string;
	barName: string;
	totalCash: number;
	totalCard: number;
	totalRevenue: number;
	totalExpenses: number;
}

export const barsApi = {
	getAll: (): Promise<Bar[]> => apiGet<Bar[]>('/bars'),

	getById: (id: string): Promise<Bar> => apiGet<Bar>(`/bars/${id}`),

	getMonthlyStats: (startDate: string, endDate: string): Promise<BarMonthlyStats[]> =>
		apiGet<BarMonthlyStats[]>(`/bars/monthly-stats?startDate=${startDate}&endDate=${endDate}`),

	create: (data: CreateBarDto): Promise<Bar> =>
		apiPost<Bar>('/bars', data),

	update: (id: string, data: UpdateBarDto): Promise<Bar> =>
		apiPatch<Bar>(`/bars/${id}`, data),

	delete: (id: string): Promise<void> =>
		apiDelete<void>(`/bars/${id}`),
};
