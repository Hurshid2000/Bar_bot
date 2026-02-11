import { apiGet, apiPost } from './client';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export interface CreateSaleDto {
	barId: string;
	productId: string;
	quantity: number;
	price: number;
	buyerName?: string;
}

export interface Sale {
	id: string;
	barId: string;
	productId: string;
	userId: string;
	quantity: number;
	price: number;
	total: number;
	buyerName?: string | null;
	date: string;
	createdAt: string;
	product?: {
		id: string;
		name: string;
		type: string;
		category?: { id: string; name: string };
	};
	bar?: { id: string; name: string };
	user?: { id: string; name: string; role: string };
}

export interface SaleFilterParams extends PaginationParams {
	barId?: string;
	startDate?: string;
	endDate?: string;
	date?: string;
}

export interface SalesSummary {
	totalAmount: number;
	count: number;
}

export const salesApi = {
	create: (data: CreateSaleDto): Promise<Sale> =>
		apiPost<Sale>('/sales', data),

	getAll: (params?: SaleFilterParams): Promise<PaginatedResponse<Sale>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.startDate) queryParams.append('startDate', params.startDate);
		if (params?.endDate) queryParams.append('endDate', params.endDate);
		if (params?.date) queryParams.append('date', params.date);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Sale>>(`/sales${query ? `?${query}` : ''}`);
	},

	getSummary: (barId: string, startDate: string, endDate: string): Promise<SalesSummary> =>
		apiGet<SalesSummary>(`/sales/summary?barId=${barId}&startDate=${startDate}&endDate=${endDate}`),

	getDaily: (barId: string, startDate: string, endDate: string): Promise<Sale[]> =>
		apiGet<Sale[]>(`/sales/daily?barId=${barId}&startDate=${startDate}&endDate=${endDate}`),

	getSportpitReport: (
		barId: string,
		startDate: string,
		endDate: string,
	): Promise<SportpitReport> =>
		apiGet<SportpitReport>(
			`/sales/sportpit-report?barId=${barId}&startDate=${startDate}&endDate=${endDate}`,
		),
};

export interface SportpitReportItem {
	productId: string;
	productName: string;
	categoryName: string;
	quantity: number;
	revenue: number;
	cost: number;
	profit: number;
}

export interface SportpitReport {
	items: SportpitReportItem[];
	totalRevenue: number;
	totalCost: number;
	totalProfit: number;
}
