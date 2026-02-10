import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Expense, PaginatedResponse, PaginationParams } from '../types/common.types';

export interface CreateExpenseDto {
	barId: string;
	amount: number;
	description: string;
	date?: string; // yyyy-MM-dd, по умолчанию сегодня
}

export interface UpdateExpenseDto {
	amount?: number;
	description?: string;
	date?: string;
}

export interface ExpenseFilterParams extends PaginationParams {
	barId?: string;
	date?: string;
	startDate?: string;
	endDate?: string;
}

export const expensesApi = {
	getAll: (
		params?: ExpenseFilterParams,
	): Promise<PaginatedResponse<Expense>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.date) queryParams.append('date', params.date);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());

		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Expense>>(
			`/expenses${query ? `?${query}` : ''}`,
		);
	},

	getById: (id: string): Promise<Expense> =>
		apiGet<Expense>(`/expenses/${id}`),

	create: (data: CreateExpenseDto): Promise<Expense> =>
		apiPost<Expense>('/expenses', data),

	update: (id: string, data: UpdateExpenseDto): Promise<Expense> =>
		apiPatch<Expense>(`/expenses/${id}`, data),

	delete: (id: string): Promise<void> =>
		apiDelete<void>(`/expenses/${id}`),
};
