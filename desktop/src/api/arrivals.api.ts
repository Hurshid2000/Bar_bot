import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Arrival, PaginatedResponse } from '../types/common.types';

export interface CreateArrivalItemDto {
	productId: string;
	quantity: number;
}

export interface CreateArrivalDto {
	barId: string;
	type: 'ARRIVAL' | 'WRITE_OFF';
	items: CreateArrivalItemDto[];
	comment?: string;
}

export interface UpdateArrivalDto {
	type?: 'ARRIVAL' | 'WRITE_OFF';
	items: CreateArrivalItemDto[];
	comment?: string;
}

export interface ArrivalFilterParams {
	barId?: string;
	type?: 'ARRIVAL' | 'WRITE_OFF';
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
}

export interface ArrivalSummaryItem {
	productId: string;
	productName: string;
	productType: string;
	totalQuantity: number;
	deliveriesCount: number;
	totalAmount: number;
}

export interface ArrivalSummaryResponse {
	items: ArrivalSummaryItem[];
	totalDeliveries: number;
}

export const arrivalsApi = {
	create: (data: CreateArrivalDto): Promise<Arrival> =>
		apiPost<Arrival>('/arrivals', data),

	getAll: (params?: ArrivalFilterParams): Promise<PaginatedResponse<Arrival>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.type) queryParams.append('type', params.type);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Arrival>>(`/arrivals${query ? `?${query}` : ''}`);
	},

	getSummary: (params?: ArrivalFilterParams): Promise<ArrivalSummaryResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.type) queryParams.append('type', params.type);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		const query = queryParams.toString();
		return apiGet<ArrivalSummaryResponse>(`/arrivals/summary${query ? `?${query}` : ''}`);
	},

	getById: (id: string): Promise<Arrival> =>
		apiGet<Arrival>(`/arrivals/${id}`),

	update: (id: string, data: UpdateArrivalDto): Promise<Arrival> =>
		apiPatch<Arrival>(`/arrivals/${id}`, data),

	remove: (id: string): Promise<{ id: string }> =>
		apiDelete<{ id: string }>(`/arrivals/${id}`),
};
