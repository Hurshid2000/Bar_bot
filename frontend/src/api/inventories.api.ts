import { apiGet, apiPost } from './client';
import type { PaginatedResponse } from '../types/common.types';

export interface CreateInventoryItemDto {
	productId: string;
	quantity: number;
}

export interface CreateInventoryDto {
	barId: string;
	items: CreateInventoryItemDto[];
	comment?: string;
}

export interface InventoryItem {
	id: string;
	inventoryId: string;
	productId: string;
	quantity: number;
	price: number;
	totalAmount: number;
	product?: {
		id: string;
		name: string;
		type: string;
		category?: {
			id: string;
			name: string;
		};
	};
}

export interface Inventory {
	id: string;
	barId: string;
	userId: string;
	comment?: string | null;
	totalAmount: number;
	createdAt: string;
	updatedAt: string;
	bar?: {
		id: string;
		name: string;
	};
	user?: {
		id: string;
		name: string;
		role: string;
	};
	items: InventoryItem[];
}

export interface InventoryFilterParams {
	barId?: string;
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
}

export interface InventoryComparison {
	current: Inventory;
	previous: Inventory | null;
	comparison: Array<{
		productId: string;
		product: any;
		currentQuantity: number | null;
		previousQuantity: number | null;
		difference: number;
		currentAmount: number | null;
		previousAmount: number | null;
		amountDifference: number;
	}>;
	totalDifference: number;
}

export const inventoriesApi = {
	create: (data: CreateInventoryDto): Promise<Inventory> =>
		apiPost<Inventory>('/inventories', data),

	getAll: (params?: InventoryFilterParams): Promise<PaginatedResponse<Inventory>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Inventory>>(`/inventories${query ? `?${query}` : ''}`);
	},

	getById: (id: string): Promise<Inventory> =>
		apiGet<Inventory>(`/inventories/${id}`),

	compareWithPrevious: (id: string): Promise<InventoryComparison> =>
		apiGet<InventoryComparison>(`/inventories/${id}/compare`),
};
