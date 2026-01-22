import { apiGet, apiPost } from './client';
import type { Revenue, PaginatedResponse, PaginationParams } from '../types/common.types';

export interface CreateRevenueDto {
	barId: string;
	date: string;
	cash?: number;  // Опционально - можно обновлять только cash
	card?: number;  // Опционально - можно обновлять только card
}

export interface RevenueFilterParams extends PaginationParams {
	barId?: string;
	date?: string;
	startDate?: string;
	endDate?: string;
}

export const revenueApi = {
	getAll: (
		params?: RevenueFilterParams,
	): Promise<PaginatedResponse<Revenue>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.date) queryParams.append('date', params.date);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());

		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Revenue>>(
			`/revenue${query ? `?${query}` : ''}`,
		);
	},

	create: (data: CreateRevenueDto): Promise<Revenue> =>
		apiPost<Revenue>('/revenue', data),
};
