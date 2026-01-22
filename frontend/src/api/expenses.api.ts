import { apiGet, apiPost } from './client';
import type { Expense, PaginatedResponse, PaginationParams } from '../types/common.types';

export interface CreateExpenseDto {
	barId: string;
	amount: number;
	description: string;
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

	create: (data: CreateExpenseDto): Promise<Expense> =>
		apiPost<Expense>('/expenses', data),
};
