import { PaginatedResponse } from '../dto/pagination.dto';

export function createPaginatedResponse<T>(
	data: T[],
	total: number,
	page: number,
	limit: number,
): PaginatedResponse<T> {
	const totalPages = Math.ceil(total / limit);

	return {
		data,
		total,
		page,
		limit,
		totalPages,
	};
}

export function getSkip(page: number, limit: number): number {
	return (page - 1) * limit;
}
