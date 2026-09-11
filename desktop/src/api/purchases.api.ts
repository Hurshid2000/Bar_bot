import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
	Purchase,
	PurchaseItem,
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

export interface UpdatePurchaseDto {
	items: CreatePurchaseItemDto[];
}

export interface PurchaseFilterParams extends PaginationParams {
	barId?: string;
	startDate?: string;
	endDate?: string;
}

/** Разобранная позиция закупа (в БД хранится JSON-снимком в поле name). */
export interface ParsedPurchaseItem {
	productName: string;
	productId?: string;
	price: number;
	quantity: number;
}

/** Парсит JSON-снимок позиции закупа. Возвращает null, если формат неизвестен. */
export function parsePurchaseItem(item: PurchaseItem): ParsedPurchaseItem {
	try {
		const data = JSON.parse(item.name);
		return {
			productName: data.productName ?? item.name,
			productId: data.productId,
			price: Number(data.price) || 0,
			quantity: Number(data.quantity ?? item.amount) || 0,
		};
	} catch {
		return { productName: item.name, price: 0, quantity: item.amount };
	}
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

	update: (id: string, data: UpdatePurchaseDto): Promise<Purchase> =>
		apiPatch<Purchase>(`/purchases/${id}`, data),

	remove: (id: string): Promise<{ id: string }> =>
		apiDelete<{ id: string }>(`/purchases/${id}`),
};
