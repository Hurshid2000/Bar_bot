import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { arrivalsApi, type CreateArrivalItemDto } from '../../api/arrivals.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { ProductType, RoleType, type Product } from '../../types/common.types';
import { OrderProductCard } from '../Orders/components/OrderProductCard';
import { OrderSportpitCard } from '../Orders/components/OrderSportpitCard';
import { OrderFoodCard } from '../Orders/components/OrderFoodCard';
import { CategoryFilter } from '../Catalog/components/CategoryFilter';
import { ArrivalConfirmModal } from './components/ArrivalConfirmModal';
import { Button } from '../../components/ui/Button';
import './ArrivalCreatePage.css';

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

export function ArrivalCreatePage() {
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

	// Для приходов нужен выбранный бар (кроме админа, который выберет в модальном окне)
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

	const handleArrivalClick = () => {
		setShowConfirmModal(true);
	};

	const createArrivalMutation = useMutation({
		mutationFn: (data: { barId: string; type: 'ARRIVAL' | 'WRITE_OFF'; items: CreateArrivalItemDto[]; comment?: string }) =>
			arrivalsApi.create(data),
		onSuccess: async () => {
			await queryClient.refetchQueries({ queryKey: ['arrivals'] });
			setQuantities({});
			setShowConfirmModal(false);
			navigate('/orders?mode=arrival');
		},
		onError: (error: any) => {
			const apiMessage = error?.data?.message;
			const message = Array.isArray(apiMessage)
				? apiMessage.join('\n')
				: apiMessage || error?.message || 'Не удалось создать приход. Попробуйте ещё раз.';
			alert(`Ошибка: ${message}`);
		},
	});

	const handleConfirmArrival = (barId: string, type: 'ARRIVAL' | 'WRITE_OFF', comment?: string) => {
		createArrivalMutation.mutate({
			barId,
			type,
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
			<div className="arrival-create-page">
				<div className="arrival-create-header">
					<Button variant="ghost" onClick={() => navigate('/orders')} className="arrival-create-back-btn">
						<ArrowLeft size={20} />
						Назад
					</Button>
				</div>
				<p className="arrival-create-no-bar">Выберите бар для создания прихода</p>
			</div>
		);
	}

	return (
		<div className="arrival-create-page">
			<div className="arrival-create-header">
				<Button variant="ghost" onClick={() => navigate('/orders')} className="arrival-create-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
			</div>

			{/* Tabs */}
			<div className="arrival-create-tabs">
				{(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
					<button
						key={tab}
						className={`arrival-create-tab ${activeTab === tab ? 'arrival-create-tab-active' : ''}`}
						onClick={() => handleTabChange(tab)}
					>
						{TAB_CONFIG[tab].label}
					</button>
				))}
			</div>

			{/* Search */}
			<div className="arrival-create-search">
				<Search className="arrival-create-search-icon" size={20} />
				<input
					type="text"
					className="arrival-create-search-input"
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
				<div className="arrival-create-list">
					{productsData.data.map(renderProductCard)}
				</div>
			) : (
				<div className="arrival-create-empty">
					<p>{tabConfig.emptyText}</p>
				</div>
			)}

			{/* Fixed Arrival Button */}
			{hasSelectedItems && (
				<div className="arrival-create-fixed-btn">
					<Button variant="primary" size="lg" onClick={handleArrivalClick} className="arrival-create-btn-full">
						Продолжить ({selectedItems.reduce((sum, item) => sum + item.quantity, 0)})
					</Button>
				</div>
			)}

			{/* Confirm Modal */}
			<ArrivalConfirmModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmArrival}
				selectedItems={selectedItems}
				products={productsData?.data || []}
				isLoading={createArrivalMutation.isPending}
				defaultBarId={selectedBar?.id}
				userRole={user?.role}
			/>
		</div>
	);
}
