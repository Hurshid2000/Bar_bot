import { apiGet, apiPost, apiPatch } from './client';
import type { PaginatedResponse } from '../types/common.types';

export interface Client {
	id: string;
	barId: string;
	name: string;
	phone?: string | null;
	balance: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	bar?: {
		id: string;
		name: string;
	};
}

export interface ClientTransaction {
	id: string;
	clientId: string;
	userId: string;
	type: 'DEPOSIT' | 'DEBT' | 'PAYMENT';
	amount: number;
	comment?: string | null;
	createdAt: string;
	user?: {
		id: string;
		name: string;
	};
}

export interface ClientEditLog {
	id: string;
	clientId: string;
	userId: string;
	fieldName: string;
	oldValue?: string | null;
	newValue?: string | null;
	createdAt: string;
	user?: {
		id: string;
		name: string;
	};
}

export interface CreateClientDto {
	barId: string;
	name: string;
	phone?: string;
}

export interface UpdateClientDto {
	name?: string;
	phone?: string;
	isActive?: boolean;
}

export interface CreateTransactionDto {
	type: 'DEPOSIT' | 'DEBT' | 'PAYMENT';
	amount: number;
	comment?: string;
}

export interface ClientFilterParams {
	barId?: string;
	search?: string;
	isActive?: boolean;
	sortBy?: 'debt' | 'deposit' | 'all';
	page?: number;
	limit?: number;
}

export interface ClientStatistics {
	totalDebt: number;
	totalDeposit: number;
	debtorsCount: number;
	depositorsCount: number;
	totalClients: number;
}

export const clientsApi = {
	create: (data: CreateClientDto): Promise<Client> =>
		apiPost<Client>('/clients', data),

	getAll: (params?: ClientFilterParams): Promise<PaginatedResponse<Client>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.search) queryParams.append('search', params.search);
		if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
		if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());
		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Client>>(`/clients${query ? `?${query}` : ''}`);
	},

	getById: (id: string): Promise<Client> =>
		apiGet<Client>(`/clients/${id}`),

	update: (id: string, data: UpdateClientDto): Promise<Client> =>
		apiPatch<Client>(`/clients/${id}`, data),

	createTransaction: (id: string, data: CreateTransactionDto): Promise<{ transaction: ClientTransaction; client: Client }> =>
		apiPost<{ transaction: ClientTransaction; client: Client }>(`/clients/${id}/transactions`, data),

	getTransactions: (id: string): Promise<ClientTransaction[]> =>
		apiGet<ClientTransaction[]>(`/clients/${id}/transactions`),

	getEditLogs: (id: string): Promise<ClientEditLog[]> =>
		apiGet<ClientEditLog[]>(`/clients/${id}/edit-logs`),

	getStatistics: (barId: string): Promise<ClientStatistics> =>
		apiGet<ClientStatistics>(`/clients/statistics/${barId}`),
};
