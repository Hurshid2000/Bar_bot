import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { ordersApi, type CreateOrderItemDto } from '../../api/orders.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { ProductType, RoleType, type Product } from '../../types/common.types';
import { OrderProductCard } from './components/OrderProductCard';
import { OrderSportpitCard } from './components/OrderSportpitCard';
import { OrderFoodCard } from './components/OrderFoodCard';
import { CategoryFilter } from '../Catalog/components/CategoryFilter';
import { OrderConfirmModal } from './components/OrderConfirmModal';
import { Button } from '../../components/ui/Button';
import './OrderCreatePage.css';

type TabType = 'products' | 'sportpit' | 'food';

const TAB_CONFIG: Record<TabType, { type: ProductType; label: string; emptyText: string }> = {
	products: {
		type: ProductType.PRODUCT,
		label: 'Products',
		emptyText: 'Продукты не найдены',
	},
	sportpit: {
		type: ProductType.SPORT_PIT,
		label: 'Sportpit',
		emptyText: 'Спортпит не найден',
	},
	food: {
		type: ProductType.FOOD,
		label: 'Food',
		emptyText: 'Еда не найдена',
	},
};

export function OrderCreatePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { selectedBar } = useBar();
	const { user, hasRole } = useAuth();
	const [activeTab, setActiveTab] = useState<TabType>('products');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const [showConfirmModal, setShowConfirmModal] = useState(false);

	const isAdmin = hasRole([RoleType.ADMIN]);
	const tabConfig = TAB_CONFIG[activeTab];

	// Для заказов нужен выбранный бар (кроме админа, который выберет в модальном окне)
	const barIdForQuery = selectedBar?.id;

	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', barIdForQuery, tabConfig.type, selectedCategoryId, searchQuery],
		queryFn: () =>
			productsApi.getAll({
				barId: barIdForQuery,
				type: tabConfig.type,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 100,
			}),
		enabled: !!barIdForQuery || isAdmin,
	});

	const { data: categories } = useQuery({
		queryKey: ['categories', tabConfig.type],
		queryFn: () => categoriesApi.getAll({ type: tabConfig.type }),
	});

	const filteredCategories = categories || [];

	// Подсчитываем количество выбранных товаров
	const selectedItems = useMemo(() => {
		return Object.entries(quantities)
			.filter(([_, qty]) => qty > 0)
			.map(([productId, quantity]) => ({ productId, quantity }));
	}, [quantities]);

	const hasSelectedItems = selectedItems.length > 0;

	const handleQuantityChange = (productId: string, quantity: number) => {
		setQuantities((prev) => ({
			...prev,
			[productId]: quantity,
		}));
	};

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		setSelectedCategoryId(null);
		setSearchQuery('');
	};

	const handleCategorySelect = (categoryId: string | null) => {
		setSelectedCategoryId(categoryId);
	};

	const handleOrderClick = () => {
		setShowConfirmModal(true);
	};

	const createOrderMutation = useMutation({
		mutationFn: (data: { barId: string; items: CreateOrderItemDto[]; comment?: string }) =>
			ordersApi.create(data),
		onSuccess: (order) => {
			queryClient.invalidateQueries({ queryKey: ['orders'] });
			setQuantities({});
			navigate(`/orders/${order.id}`);
		},
	});

	const handleConfirmOrder = (barId: string, comment?: string) => {
		createOrderMutation.mutate({
			barId,
			items: selectedItems,
			comment,
		});
	};

	const renderProductCard = (product: Product) => {
		const quantity = quantities[product.id] || 0;

		switch (activeTab) {
			case 'products':
				return (
					<OrderProductCard
						key={product.id}
						product={product}
						quantity={quantity}
						onQuantityChange={handleQuantityChange}
					/>
				);
			case 'sportpit':
				return (
					<OrderSportpitCard
						key={product.id}
						product={product}
						quantity={quantity}
						onQuantityChange={handleQuantityChange}
					/>
				);
			case 'food':
				return (
					<OrderFoodCard
						key={product.id}
						product={product}
						quantity={quantity}
						onQuantityChange={handleQuantityChange}
					/>
				);
		}
	};

	// Для не-админов нужен выбранный бар
	if (!selectedBar && !isAdmin) {
		return (
			<div className="order-create-page">
				<p className="order-create-no-bar">Выберите бар для создания заказа</p>
			</div>
		);
	}

	return (
		<div className="order-create-page">
			{/* Tabs */}
			<div className="order-create-tabs">
				{(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
					<button
						key={tab}
						className={`order-create-tab ${activeTab === tab ? 'order-create-tab-active' : ''}`}
						onClick={() => handleTabChange(tab)}
					>
						{TAB_CONFIG[tab].label}
					</button>
				))}
			</div>

			{/* Search */}
			<div className="order-create-search">
				<Search className="order-create-search-icon" size={20} />
				<input
					type="text"
					className="order-create-search-input"
					placeholder="Поиск по названию"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			{/* Category Filter */}
			<CategoryFilter
				categories={filteredCategories}
				selectedCategoryId={selectedCategoryId}
				onSelect={handleCategorySelect}
			/>

			{/* Products List */}
			{productsLoading ? (
				<Loading />
			) : productsData && productsData.data.length > 0 ? (
				<div className="order-create-list">
					{productsData.data.map(renderProductCard)}
				</div>
			) : (
				<div className="order-create-empty">
					<p>{tabConfig.emptyText}</p>
				</div>
			)}

			{/* Fixed Order Button */}
			{hasSelectedItems && (
				<div className="order-create-fixed-btn">
					<Button variant="primary" size="lg" onClick={handleOrderClick} className="order-create-btn-full">
						Заказать ({selectedItems.reduce((sum, item) => sum + item.quantity, 0)})
					</Button>
				</div>
			)}

			{/* Confirm Modal */}
			<OrderConfirmModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmOrder}
				selectedItems={selectedItems}
				products={productsData?.data || []}
				isLoading={createOrderMutation.isPending}
				defaultBarId={selectedBar?.id}
				userRole={user?.role}
			/>
		</div>
	);
}
