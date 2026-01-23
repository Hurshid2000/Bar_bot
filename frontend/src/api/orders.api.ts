import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Order, PaginatedResponse } from '../types/common.types';

export interface CreateOrderItemDto {
	productId: string;
	quantity: number;
}

export interface CreateOrderDto {
	barId: string;
	items: CreateOrderItemDto[];
	comment?: string;
}

export interface UpdateOrderDto {
	status?: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	comment?: string;
}

export interface OrderFilterParams {
	barId?: string;
	status?: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
}

export const ordersApi = {
	create: (data: CreateOrderDto): Promise<Order> =>
		apiPost<Order>('/orders', data),

	getAll: (params?: OrderFilterParams): Promise<PaginatedResponse<Order>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.status) queryParams.append('status', params.status);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Order>>(`/orders${query ? `?${query}` : ''}`);
	},

	getById: (id: string): Promise<Order> =>
		apiGet<Order>(`/orders/${id}`),

	update: (id: string, data: UpdateOrderDto): Promise<Order> =>
		apiPatch<Order>(`/orders/${id}`, data),

	delete: (id: string): Promise<void> =>
		apiDelete<void>(`/orders/${id}`),
};
