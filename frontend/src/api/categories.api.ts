import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Category } from '../types/common.types';

export interface CreateCategoryDto {
	name: string;
}

export interface UpdateCategoryDto {
	name?: string;
}

export interface SearchParams {
	search?: string;
}

export const categoriesApi = {
	getAll: (params?: SearchParams): Promise<Category[]> => {
		const query = params?.search
			? `?search=${encodeURIComponent(params.search)}`
			: '';
		return apiGet<Category[]>(`/categories${query}`);
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
