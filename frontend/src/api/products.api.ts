import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
	Product,
	PaginatedResponse,
	PaginationParams,
} from '../types/common.types';
import { ProductType } from '../types/common.types';

export interface CreateProductDto {
	name: string;
	barcode?: string;
	type?: ProductType;
	costPrice: number;
	price: number;
	barId: string;
	categoryId: string;
}

export interface UpdateProductDto {
	name?: string;
	barcode?: string;
	type?: ProductType;
	costPrice?: number;
	price?: number;
	categoryId?: string;
}

export interface ProductFilterParams extends PaginationParams {
	barId?: string;
	categoryId?: string;
	type?: ProductType;
	search?: string;
}

export const productsApi = {
	getAll: (params?: ProductFilterParams): Promise<PaginatedResponse<Product>> => {
		const queryParams = new URLSearchParams();
		if (params?.barId) queryParams.append('barId', params.barId);
		if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
		if (params?.type) queryParams.append('type', params.type);
		if (params?.search) queryParams.append('search', params.search);
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());

		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Product>>(
			`/products${query ? `?${query}` : ''}`,
		);
	},

	getByBar: (
		barId: string,
		params?: PaginationParams,
	): Promise<PaginatedResponse<Product>> => {
		const queryParams = new URLSearchParams();
		if (params?.page) queryParams.append('page', params.page.toString());
		if (params?.limit) queryParams.append('limit', params.limit.toString());

		const query = queryParams.toString();
		return apiGet<PaginatedResponse<Product>>(
			`/products/bar/${barId}${query ? `?${query}` : ''}`,
		);
	},

	getById: (id: string): Promise<Product> => apiGet<Product>(`/products/${id}`),

	create: (data: CreateProductDto): Promise<Product> =>
		apiPost<Product>('/products', data),

	update: (id: string, data: UpdateProductDto): Promise<Product> =>
		apiPatch<Product>(`/products/${id}`, data),

	delete: (id: string): Promise<void> => apiDelete<void>(`/products/${id}`),
};
