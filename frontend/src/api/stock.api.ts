import { apiGet } from './client';

export interface StockItem {
	id: string;
	barId: string;
	productId: string;
	quantity: number;
	updatedAt: string;
	product?: {
		id: string;
		name: string;
		type: string;
		category?: { id: string; name: string };
	};
}

export const stockApi = {
	getByBar: (barId: string, productType?: string): Promise<StockItem[]> => {
		const params = new URLSearchParams();
		if (barId) params.append('barId', barId);
		if (productType) params.append('productType', productType);
		const query = params.toString();
		return apiGet<StockItem[]>(`/stock${query ? `?${query}` : ''}`);
	},

	getStockMap: (barId: string): Promise<Record<string, number>> =>
		apiGet<Record<string, number>>(`/stock/map/${barId}`),
};
