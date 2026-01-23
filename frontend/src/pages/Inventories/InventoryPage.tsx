import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ArrowLeft } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { inventoriesApi, type CreateInventoryItemDto } from '../../api/inventories.api';
import { Loading } from '../../components/ui/Loading';
import { ProductType, type Product } from '../../types/common.types';
import { OrderProductCard } from '../Orders/components/OrderProductCard';
import { OrderSportpitCard } from '../Orders/components/OrderSportpitCard';
import { OrderFoodCard } from '../Orders/components/OrderFoodCard';
import { CategoryFilter } from '../Catalog/components/CategoryFilter';
import { InventoryConfirmModal } from './components/InventoryConfirmModal';
import { Button } from '../../components/ui/Button';
import './InventoryPage.css';

type TabType = 'products' | 'sportpit' | 'food';
type ModeType = 'inventory' | 'history';

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

export function InventoryPage() {
	const { id: barId } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [mode, setMode] = useState<ModeType>('inventory');
	const [activeTab, setActiveTab] = useState<TabType>('products');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const [showConfirmModal, setShowConfirmModal] = useState(false);

	const tabConfig = TAB_CONFIG[activeTab];

	// Загружаем продукты для инвентаризации
	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', barId, tabConfig.type, selectedCategoryId, searchQuery],
		queryFn: () =>
			productsApi.getAll({
				barId: barId!,
				type: tabConfig.type,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 100,
			}),
		enabled: !!barId && mode === 'inventory',
	});

	// Загружаем категории
	const { data: categories } = useQuery({
		queryKey: ['categories', tabConfig.type],
		queryFn: () => categoriesApi.getAll({ type: tabConfig.type }),
		enabled: mode === 'inventory',
	});

	// Загружаем историю инвентаризаций
	const { data: inventoriesData, isLoading: inventoriesLoading } = useQuery({
		queryKey: ['inventories', barId],
		queryFn: () => inventoriesApi.getAll({ barId: barId!, page: 1, limit: 20 }),
		enabled: !!barId && mode === 'history',
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

	const handleInventoryClick = () => {
		setShowConfirmModal(true);
	};

	const createInventoryMutation = useMutation({
		mutationFn: (data: { barId: string; items: CreateInventoryItemDto[]; comment?: string }) =>
			inventoriesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventories'] });
			setQuantities({});
			setMode('history');
			setShowConfirmModal(false);
		},
	});

	const handleConfirmInventory = (comment?: string) => {
		if (!barId) return;
		createInventoryMutation.mutate({
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

	if (!barId) {
		return (
			<div className="inventory-page">
				<p>Бар не найден</p>
			</div>
		);
	}

	return (
		<div className="inventory-page">
			<div className="inventory-header">
				<Button variant="ghost" onClick={() => navigate(`/bars/${barId}`)} className="inventory-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
			</div>

			{/* Переключатель режимов */}
			<div className="inventory-mode-selector">
				<Button
					variant={mode === 'inventory' ? 'primary' : 'outline'}
					size="lg"
					className="inventory-mode-btn"
					onClick={() => setMode('inventory')}
				>
					Инвентаризация
				</Button>
				<Button
					variant={mode === 'history' ? 'primary' : 'outline'}
					size="lg"
					className="inventory-mode-btn"
					onClick={() => setMode('history')}
				>
					История
				</Button>
			</div>

			{mode === 'inventory' && (
				<>
					{/* Tabs */}
					<div className="inventory-tabs">
						{(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
							<button
								key={tab}
								className={`inventory-tab ${activeTab === tab ? 'inventory-tab-active' : ''}`}
								onClick={() => handleTabChange(tab)}
							>
								{TAB_CONFIG[tab].label}
							</button>
						))}
					</div>

					{/* Search */}
					<div className="inventory-search">
						<Search className="inventory-search-icon" size={20} />
						<input
							type="text"
							className="inventory-search-input"
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
						<div className="inventory-list">
							{productsData.data.map(renderProductCard)}
						</div>
					) : (
						<div className="inventory-empty">
							<p>{tabConfig.emptyText}</p>
						</div>
					)}

					{/* Fixed Inventory Button */}
					{hasSelectedItems && (
						<div className="inventory-fixed-btn">
							<Button variant="primary" size="lg" onClick={handleInventoryClick} className="inventory-btn-full">
								Продолжить ({selectedItems.reduce((sum, item) => sum + item.quantity, 0)})
							</Button>
						</div>
					)}

					{/* Confirm Modal */}
					<InventoryConfirmModal
						isOpen={showConfirmModal}
						onClose={() => setShowConfirmModal(false)}
						onConfirm={handleConfirmInventory}
						selectedItems={selectedItems}
						products={productsData?.data || []}
						isLoading={createInventoryMutation.isPending}
						barId={barId}
					/>
				</>
			)}

			{mode === 'history' && (
				<div className="inventory-history">
					{inventoriesLoading ? (
						<Loading />
					) : inventoriesData && inventoriesData.data.length > 0 ? (
						<div className="inventory-history-list">
							{inventoriesData.data.map((inventory) => (
								<div
									key={inventory.id}
									className="inventory-history-card"
									onClick={() => navigate(`/inventories/${inventory.id}`)}
								>
									<div className="inventory-history-card-header">
										<div>
											<h4>Инвентаризация #{inventory.id.slice(0, 8)}</h4>
											<p className="inventory-history-card-date">
												{new Date(inventory.createdAt).toLocaleDateString('ru-RU')}
											</p>
										</div>
										<span className="inventory-history-card-amount">
											{inventory.totalAmount.toFixed(2)} руб.
										</span>
									</div>
									<div className="inventory-history-card-info">
										<p>Товаров: {inventory.items.length} позиций</p>
										{inventory.comment && (
											<p className="inventory-history-card-comment">{inventory.comment}</p>
										)}
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="inventory-empty">
							<p>Инвентаризации не найдены</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
