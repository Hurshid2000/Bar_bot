export const RoleType = {
	ADMIN: 'ADMIN',
	MANAGER: 'MANAGER',
	WORKER: 'WORKER',
} as const;

export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const ProductType = {
	PRODUCT: 'PRODUCT',
	SPORT_PIT: 'SPORT_PIT',
	FOOD: 'FOOD',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export interface User {
	id: string;
	telegramId: string;
	name: string;
	role: RoleType;
	createdAt: string;
	updatedAt: string;
	bars?: UserBar[];
}

export interface UserBar {
	id: string;
	userId: string;
	barId: string;
	bar?: Bar;
}

export interface Bar {
	id: string;
	name: string;
	isActive: boolean;
	createdAt: string;
}

export interface Category {
	id: string;
	name: string;
	icon?: string;
	type?: ProductType;
}

export interface Product {
	id: string;
	name: string;
	barcode?: string;
	type: ProductType;
	costPrice: number;
	defaultPrice?: number | null; // Цена по умолчанию для всех баров
	categoryId: string;
	createdAt: string;
	category?: Category;
	imageUrl?: string;
	description?: string;
	// Цена из BarProduct (если запрашивали с barId)
	price?: number | null;
	barProduct?: BarProduct | null;
	barProducts?: BarProduct[];
}

export interface BarProduct {
	id: string;
	barId: string;
	productId: string;
	price: number;
	isActive: boolean;
	createdAt: string;
	bar?: Bar;
	product?: Product;
}

export interface Revenue {
	id: string;
	barId: string;
	date: string;
	cash: number;
	card: number;
	createdAt: string;
	bar?: Bar;
}

export interface Expense {
	id: string;
	barId: string;
	amount: number;
	description: string;
	createdAt: string;
	bar?: Bar;
}

export interface PurchaseItem {
	id: string;
	purchaseId: string;
	name: string;
	amount: number;
}

export interface Supplier {
	id: string;
	name: string;
}

export interface Purchase {
	id: string;
	barId: string;
	supplierId?: string;
	totalAmount: number;
	createdAt: string;
	bar?: Bar;
	supplier?: Supplier;
	items: PurchaseItem[];
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
}
