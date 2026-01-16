import { apiGet } from './client';

export interface DailyReport {
	barId: string;
	date: string;
	revenue: {
		cash: number;
		card: number;
		total: number;
	};
	expenses: number;
	purchases: number;
	profit: number;
}

export interface MonthlyReport {
	barId: string;
	month: string;
	revenue: {
		cash: number;
		card: number;
		total: number;
	};
	expenses: number;
	purchases: number;
	profit: number;
	dailyStats: Array<{
		date: string;
		revenue: number;
		expenses: number;
		profit: number;
	}>;
}

export interface PeriodReport {
	barId: string;
	startDate: string;
	endDate: string;
	revenue: {
		cash: number;
		card: number;
		total: number;
	};
	expenses: number;
	purchases: number;
	profit: number;
}

export interface TopProduct {
	productId: string;
	productName: string;
	quantity: number;
	revenue: number;
}

export interface ProductTypeStats {
	type: string;
	revenue: number;
	quantity: number;
}

export interface CompareBarsReport {
	barIds: string[];
	startDate: string;
	endDate: string;
	bars: Array<{
		barId: string;
		barName: string;
		revenue: number;
		expenses: number;
		purchases: number;
		profit: number;
	}>;
}

export const reportsApi = {
	getDailyReport: (barId: string, date: string): Promise<DailyReport> =>
		apiGet<DailyReport>(`/reports/bars/${barId}/daily?date=${date}`),

	getMonthlyReport: (barId: string, month: string): Promise<MonthlyReport> =>
		apiGet<MonthlyReport>(`/reports/bars/${barId}/monthly?month=${month}`),

	getPeriodReport: (
		barId: string,
		startDate: string,
		endDate: string,
	): Promise<PeriodReport> =>
		apiGet<PeriodReport>(
			`/reports/bars/${barId}/period?startDate=${startDate}&endDate=${endDate}`,
		),

	getTopProducts: (
		barId: string,
		startDate: string,
		endDate: string,
		limit?: number,
	): Promise<TopProduct[]> => {
		const queryParams = new URLSearchParams();
		queryParams.append('startDate', startDate);
		queryParams.append('endDate', endDate);
		if (limit) queryParams.append('limit', limit.toString());

		return apiGet<TopProduct[]>(
			`/reports/bars/${barId}/top-products?${queryParams.toString()}`,
		);
	},

	getProductTypeStats: (
		barId: string,
		startDate: string,
		endDate: string,
	): Promise<ProductTypeStats[]> => {
		const queryParams = new URLSearchParams();
		queryParams.append('startDate', startDate);
		queryParams.append('endDate', endDate);

		return apiGet<ProductTypeStats[]>(
			`/reports/bars/${barId}/product-type-stats?${queryParams.toString()}`,
		);
	},

	compareBars: (
		barIds: string[],
		startDate: string,
		endDate: string,
	): Promise<CompareBarsReport> => {
		const queryParams = new URLSearchParams();
		queryParams.append('barIds', barIds.join(','));
		queryParams.append('startDate', startDate);
		queryParams.append('endDate', endDate);

		return apiGet<CompareBarsReport>(`/reports/compare?${queryParams.toString()}`);
	},
};
