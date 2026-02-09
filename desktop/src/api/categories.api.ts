import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Category, ProductType } from '../types/common.types';

export interface CreateCategoryDto {
	name: string;
	type?: ProductType;
}

export interface UpdateCategoryDto {
	name?: string;
	type?: ProductType;
}

export interface CategoryFilterParams {
	search?: string;
	type?: ProductType;
}

export const categoriesApi = {
	getAll: (params?: CategoryFilterParams): Promise<Category[]> => {
		const queryParams = new URLSearchParams();
		if (params?.search) queryParams.append('search', params.search);
		if (params?.type) queryParams.append('type', params.type);
		const query = queryParams.toString();
		return apiGet<Category[]>(`/categories${query ? `?${query}` : ''}`);
	},

	getById: (id: string): Promise<Category> =>
		apiGet<Category>(`/categories/${id}`),

	create: (data: CreateCategoryDto): Promise<Category> =>
		apiPost<Category>('/categories', data),

	update: (id: string, data: UpdateCategoryDto): Promise<Category> =>
		apiPatch<Category>(`/categories/${id}`, data),

	delete: (id: string): Promise<void> =>
		apiDelete<void>(`/categories/${id}`),
};
