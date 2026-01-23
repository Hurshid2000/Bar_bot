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

export interface Inventory {
	id: string;
	createdAt: string;
	totalAmount: number;
	comment: string | null;
}

export interface CashAuditReport {
	barId: string;
	barName: string;
	startInventoryId: string;
	startInventoryDate: string;
	startInventoryAmount: number;
	endInventoryId: string;
	endInventoryDate: string;
	endInventoryAmount: number;
	period: {
		startDate: string;
		endDate: string;
	};
	incomes: {
		revenueCash: number;
		revenueCard: number;
		writeOffs: number;
		clientDebts: number;
	};
	expenses: {
		purchasesAtSalePrice: number;
		clientDeposits: number;
	};
	result: number;
	status: 'ok' | 'surplus' | 'shortage';
}

export interface ProfitReport {
	barId: string;
	barName: string;
	startInventoryId: string;
	startInventoryDate: string;
	startInventoryAmount: number;
	endInventoryId: string;
	endInventoryDate: string;
	endInventoryAmount: number;
	period: {
		startDate: string;
		endDate: string;
	};
	incomes: {
		revenueCash: number;
		revenueCard: number;
		clientDebts: number;
	};
	expenses: {
		purchasesAtCostPrice: number;
		expenses: number;
		clientDeposits: number;
	};
	profit: number;
}

export interface ProfitComparisonPeriods {
	barId: string;
	barName: string;
	firstPeriod: ProfitReport;
	secondPeriod: ProfitReport;
	comparison: {
		profitDifference: number;
		profitChangePercent: number;
	};
}

export interface ProfitComparisonBars {
	period: {
		startDate: string;
		endDate: string;
	};
	bars: ProfitReport[];
	comparison: {
		bestBar: {
			barId: string;
			barName: string;
			profit: number;
		};
		worstBar: {
			barId: string;
			barName: string;
			profit: number;
		};
		averageProfit: number;
	};
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

	// Новые методы для отчетов между инвентаризациями
	getInventories: (barId: string): Promise<Inventory[]> =>
		apiGet<Inventory[]>(`/reports/bars/${barId}/inventories`),

	getCashAuditReport: (
		barId: string,
		startInventoryId: string,
		endInventoryId: string,
	): Promise<CashAuditReport> => {
		const queryParams = new URLSearchParams();
		queryParams.append('startInventoryId', startInventoryId);
		queryParams.append('endInventoryId', endInventoryId);

		return apiGet<CashAuditReport>(
			`/reports/bars/${barId}/cash-audit?${queryParams.toString()}`,
		);
	},

	getProfitReport: (
		barId: string,
		startInventoryId: string,
		endInventoryId: string,
	): Promise<ProfitReport> => {
		const queryParams = new URLSearchParams();
		queryParams.append('startInventoryId', startInventoryId);
		queryParams.append('endInventoryId', endInventoryId);

		return apiGet<ProfitReport>(
			`/reports/bars/${barId}/profit?${queryParams.toString()}`,
		);
	},

	compareProfitPeriods: (
		barId: string,
		firstStartInventoryId: string,
		firstEndInventoryId: string,
		secondStartInventoryId: string,
		secondEndInventoryId: string,
	): Promise<ProfitComparisonPeriods> => {
		const queryParams = new URLSearchParams();
		queryParams.append('firstStartInventoryId', firstStartInventoryId);
		queryParams.append('firstEndInventoryId', firstEndInventoryId);
		queryParams.append('secondStartInventoryId', secondStartInventoryId);
		queryParams.append('secondEndInventoryId', secondEndInventoryId);

		return apiGet<ProfitComparisonPeriods>(
			`/reports/bars/${barId}/profit/compare-periods?${queryParams.toString()}`,
		);
	},

	compareProfitBars: (
		barIds: string[],
		startInventoryId: string,
		endInventoryId: string,
	): Promise<ProfitComparisonBars> => {
		const queryParams = new URLSearchParams();
		queryParams.append('barIds', barIds.join(','));
		queryParams.append('startInventoryId', startInventoryId);
		queryParams.append('endInventoryId', endInventoryId);

		return apiGet<ProfitComparisonBars>(
			`/reports/profit/compare-bars?${queryParams.toString()}`,
		);
	},
};
