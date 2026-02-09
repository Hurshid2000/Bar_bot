import { apiGet, apiPost } from './client';
import type {
	Purchase,
	PaginatedResponse,
	PaginationParams,
} from '../types/common.types';

export interface CreatePurchaseItemDto {
	productId: string;
	quantity: number;
}

export interface CreatePurchaseDto {
	barId: string;
	items: CreatePurchaseItemDto[];
}

export interface PurchaseFilterParams extends PaginationParams {
	barId?: string;
	startDate?: string;
	endDate?: string;
}

export const purchasesApi = {
	getAll: (
		params?: PurchaseFilterParams,
	): Promise<PaginatedResponse<Purchase>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());

		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Purchase>>(
			`/purchases${query ? `?${query}` : ''}`,
		);
	},

	create: (data: CreatePurchaseDto): Promise<Purchase> =>
		apiPost<Purchase>('/purchases', data),
};
