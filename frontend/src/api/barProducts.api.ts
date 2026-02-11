import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { BarProduct } from '../types/common.types';

export interface CreateBarProductDto {
	barId: string;
	productId: string;
	price: number;
	isActive?: boolean;
}

export interface UpdateBarProductDto {
	price?: number;
	isActive?: boolean;
	isPinned?: boolean;
}

export interface BulkAssignProduct {
	productId: string;
	price: number;
}

export const barProductsApi = {
	// Добавить продукт в бар
	create: (data: CreateBarProductDto): Promise<BarProduct> =>
		apiPost<BarProduct>('/bar-products', data),

	// Добавить несколько продуктов в бар
	bulkAssign: (barId: string, products: BulkAssignProduct[]): Promise<BarProduct[]> =>
		apiPost<BarProduct[]>(`/bar-products/bar/${barId}/bulk`, products),

	// Получить все продукты бара (по умолчанию только активные)
	getByBar: (barId: string, includeInactive = false): Promise<BarProduct[]> =>
		apiGet<BarProduct[]>(`/bar-products/bar/${barId}${includeInactive ? '?includeInactive=true' : ''}`),

	// Получить связь по ID
	getById: (id: string): Promise<BarProduct> =>
		apiGet<BarProduct>(`/bar-products/${id}`),

	// Получить цену продукта в баре
	getByBarAndProduct: (barId: string, productId: string): Promise<BarProduct> =>
		apiGet<BarProduct>(`/bar-products/bar/${barId}/product/${productId}`),

	// Обновить цену продукта в баре
	update: (id: string, data: UpdateBarProductDto): Promise<BarProduct> =>
		apiPatch<BarProduct>(`/bar-products/${id}`, data),

	// Обновить цену продукта в баре по barId и productId
	updateByBarAndProduct: (
		barId: string,
		productId: string,
		data: UpdateBarProductDto,
	): Promise<BarProduct> =>
		apiPatch<BarProduct>(`/bar-products/bar/${barId}/product/${productId}`, data),

	// Удалить продукт из бара
	delete: (id: string): Promise<void> =>
		apiDelete<void>(`/bar-products/${id}`),

	// Удалить продукт из бара по barId и productId
	deleteByBarAndProduct: (barId: string, productId: string): Promise<void> =>
		apiDelete<void>(`/bar-products/bar/${barId}/product/${productId}`),
};
