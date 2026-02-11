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

export const OrderStatus = {
	NEW: 'NEW',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ArrivalType = {
	ARRIVAL: 'ARRIVAL',
	WRITE_OFF: 'WRITE_OFF',
} as const;

export type ArrivalType = (typeof ArrivalType)[keyof typeof ArrivalType];

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
	isPinned: boolean;
	createdAt: string;
	bar?: Bar;
	product?: Product;
}

export interface RevenueAuthor {
	id: string;
	name: string;
	role: string;
}

export interface Revenue {
	id: string;
	barId: string;
	date: string;
	cash: number;
	card: number;
	createdById?: string | null;
	updatedById?: string | null;
	createdAt: string;
	updatedAt?: string | null;
	bar?: Bar;
	createdBy?: RevenueAuthor | null;
	updatedBy?: RevenueAuthor | null;
}

export interface Expense {
	id: string;
	barId: string;
	amount: number;
	description: string;
	date: string;
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

export interface OrderItem {
	id: string;
	orderId: string;
	productId: string;
	quantity: number;
	price: number;
	product?: Product;
}

export interface Order {
	id: string;
	barId: string;
	userId: string;
	status: OrderStatus;
	comment?: string | null;
	createdAt: string;
	updatedAt: string;
	bar?: Bar;
	user?: User;
	items: OrderItem[];
}

export interface ArrivalItem {
	id: string;
	arrivalId: string;
	productId: string;
	quantity: number;
	price: number;
	product?: Product;
}

export interface Arrival {
	id: string;
	barId: string;
	userId: string;
	type: ArrivalType;
	comment?: string | null;
	createdAt: string;
	updatedAt: string;
	bar?: Bar;
	user?: User;
	items: ArrivalItem[];
}
