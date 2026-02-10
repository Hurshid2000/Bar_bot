import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, PackagePlus, Globe, Store } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { barProductsApi } from '../../api/barProducts.api';
import { categoriesApi } from '../../api/categories.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { ProductType, RoleType, type Product, type BarProduct } from '../../types/common.types';
import { ProductCard } from './components/ProductCard';
import { SportpitCard } from './components/SportpitCard';
import { FoodCard } from './components/FoodCard';
import { CategoryFilter } from './components/CategoryFilter';
import { AddProductModal } from './components/AddProductModal';
import { AssignProductModal } from './components/AssignProductModal';
import { EditProductModal } from './components/EditProductModal';
import { EditPriceModal } from './components/EditPriceModal';
import './CatalogPage.css';

type TabType = 'products' | 'sportpit' | 'food' | 'inactive';
type ViewMode = 'bar' | 'global';

const TAB_CONFIG: Record<string, { type?: ProductType; label: string; emptyText: string }> = {
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
	inactive: {
		label: 'Неактивные',
		emptyText: 'Нет неактивных товаров',
	},
};

export function CatalogPage() {
	const { selectedBar } = useBar();
	const { hasRole } = useAuth();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<TabType>('products');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [editingPriceProduct, setEditingPriceProduct] = useState<Product | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>(selectedBar ? 'bar' : 'global');

	const isAdmin = hasRole([RoleType.ADMIN]);
	const canManage = hasRole([RoleType.ADMIN, RoleType.MANAGER]);
	const tabConfig = TAB_CONFIG[activeTab];
	const isInactiveTab = activeTab === 'inactive';
	const isGlobalMode = viewMode === 'global';

	// ===== ЗАПРОСЫ ДЛЯ РЕЖИМА "БАР" =====

	// Активные товары бара
	const { data: barProductsData, isLoading: barProductsLoading } = useQuery({
		queryKey: ['products', selectedBar?.id, tabConfig.type, selectedCategoryId, searchQuery, canManage, 'bar-view'],
		queryFn: () =>
			productsApi.getAll({
				barId: selectedBar?.id,
				type: tabConfig.type as ProductType,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !isGlobalMode && !isInactiveTab && !!selectedBar,
	});

	// Все BarProducts (включая неактивные) — для таба "Неактивные" бара и бейджа
	const { data: allBarProducts, isLoading: barInactiveLoading } = useQuery({
		queryKey: ['bar-products', selectedBar?.id, 'includeInactive'],
		queryFn: () => barProductsApi.getByBar(selectedBar!.id, true),
		enabled: !isGlobalMode && canManage && !!selectedBar,
	});

	// Неактивные BarProducts
	const inactiveBarProducts: BarProduct[] = (allBarProducts || []).filter(
		(bp) => !bp.isActive,
	);

	const filteredInactiveBar = searchQuery
		? inactiveBarProducts.filter((bp) =>
				bp.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: inactiveBarProducts;

	// ===== ЗАПРОСЫ ДЛЯ ГЛОБАЛЬНОГО КАТАЛОГА =====

	// Глобальные активные товары
	const { data: globalProductsData, isLoading: globalProductsLoading } = useQuery({
		queryKey: ['products', 'global', tabConfig.type, selectedCategoryId, searchQuery, isInactiveTab],
		queryFn: () =>
			productsApi.getAll({
				type: tabConfig.type as ProductType,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				includeInactive: isInactiveTab,
				page: 1,
				limit: 100,
			}),
		enabled: isGlobalMode && isAdmin,
	});

	// Для бейджа: подсчёт неактивных глобально
	const { data: globalAllData } = useQuery({
		queryKey: ['products', 'global-all-for-badge'],
		queryFn: () =>
			productsApi.getAll({
				includeInactive: true,
				page: 1,
				limit: 1000,
			}),
		enabled: isGlobalMode && isAdmin,
	});
	const globalInactiveCount = (globalAllData?.data || []).filter((p) => p.isActive === false).length;

	// Если в режиме глобального каталога + таб неактивные — фильтруем только неактивные
	const globalInactiveProducts = isInactiveTab
		? (globalProductsData?.data || []).filter((p) => p.isActive === false)
		: globalProductsData?.data || [];

	const { data: categories } = useQuery({
		queryKey: ['categories', tabConfig.type],
		queryFn: () => categoriesApi.getAll({ type: tabConfig.type as ProductType }),
		enabled: !isInactiveTab,
	});

	// ===== МУТАЦИИ =====

	// Мутация для переключения isActive в БАРЕ (BarProduct)
	const toggleBarActiveMutation = useMutation({
		mutationFn: ({ productId, isActive }: { productId: string; isActive: boolean }) =>
			barProductsApi.updateByBarAndProduct(selectedBar!.id, productId, { isActive }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['bar-products'] });
		},
	});

	// Мутация для переключения isActive ГЛОБАЛЬНО (Product)
	const toggleGlobalActiveMutation = useMutation({
		mutationFn: ({ productId, isActive }: { productId: string; isActive: boolean }) =>
			productsApi.update(productId, { isActive }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['bar-products'] });
		},
	});

	const filteredCategories = categories || [];

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		setSelectedCategoryId(null);
		setSearchQuery('');
	};

	const handleCategorySelect = (categoryId: string | null) => {
		setSelectedCategoryId(categoryId);
	};

	const handleAddProduct = () => {
		if (isAdmin) {
			setShowAddModal(true);
		} else if (canManage) {
			setShowAssignModal(true);
		}
	};

	const getSearchPlaceholder = () => {
		if (isInactiveTab) return 'Поиск среди неактивных';
		if (activeTab === 'products') return 'Поиск по названию или штрих-коду';
		return 'Поиск по названию';
	};

	const handleEditProduct = (product: Product) => {
		setEditingProduct(product);
	};

	const handleEditPrice = (product: Product) => {
		setEditingPriceProduct(product);
	};

	// Переключение isActive в зависимости от режима
	const handleToggleActive = (product: Product, isActive: boolean) => {
		if (isGlobalMode) {
			toggleGlobalActiveMutation.mutate({ productId: product.id, isActive });
		} else {
			if (!selectedBar) return;
			toggleBarActiveMutation.mutate({ productId: product.id, isActive });
		}
	};

	// Получаем isActive из barProducts для продукта (режим бара)
	const getBarProductIsActive = (product: Product): boolean | undefined => {
		if (!selectedBar) return undefined;
		const bp = product.barProducts?.find((bp) => bp.barId === selectedBar.id);
		return bp?.isActive;
	};

	const renderProductCard = (product: Product, useGlobalActive = false) => {
		const productIsActive = useGlobalActive ? product.isActive : getBarProductIsActive(product);
		const showToggle = useGlobalActive ? isAdmin : (canManage && !!selectedBar);
		const editProps = {
			onEditProduct: isAdmin ? handleEditProduct : undefined,
			onEditPrice: !useGlobalActive && canManage && selectedBar ? handleEditPrice : undefined,
			onToggleActive: showToggle ? handleToggleActive : undefined,
			isActive: productIsActive,
		};

		switch (product.type) {
			case ProductType.SPORT_PIT:
				return <SportpitCard key={product.id} product={product} {...editProps} />;
			case ProductType.FOOD:
				return <FoodCard key={product.id} product={product} {...editProps} />;
			default:
				return <ProductCard key={product.id} product={product} {...editProps} />;
		}
	};

	const renderBarInactiveCard = (bp: BarProduct) => {
		if (!bp.product) return null;
		const product: Product = {
			...bp.product,
			price: bp.price,
			barProducts: [bp],
		};
		return renderProductCard(product, false);
	};

	// Табы для отображения
	const visibleTabs: TabType[] = canManage
		? ['products', 'sportpit', 'food', 'inactive']
		: ['products', 'sportpit', 'food'];

	// Переключение режима
	const handleViewModeToggle = () => {
		const newMode = isGlobalMode ? 'bar' : 'global';
		setViewMode(newMode);
		setActiveTab('products');
		setSelectedCategoryId(null);
		setSearchQuery('');
	};

	// Не-админы должны выбрать бар
	if (!selectedBar && !isAdmin) {
		return (
			<div className="catalog-page">
				<p className="catalog-no-bar">Выберите бар для просмотра каталога</p>
			</div>
		);
	}

	// Определяем данные и состояние загрузки для текущего режима
	const isLoading = isGlobalMode ? globalProductsLoading : barProductsLoading;
	const currentProducts = isGlobalMode
		? (isInactiveTab ? globalInactiveProducts : globalProductsData?.data || [])
		: barProductsData?.data || [];
	const inactiveBadgeCount = isGlobalMode ? globalInactiveCount : inactiveBarProducts.length;

	return (
		<div className="catalog-page">
			{/* Переключатель режима для админов */}
			{isAdmin && (
				<div className="catalog-view-toggle">
					<button
						className={`catalog-view-btn ${!isGlobalMode ? 'catalog-view-btn-active' : ''}`}
						onClick={() => { if (isGlobalMode) handleViewModeToggle(); }}
						disabled={!selectedBar}
					>
						<Store size={16} />
						<span>{selectedBar ? selectedBar.name : 'Бар не выбран'}</span>
					</button>
					<button
						className={`catalog-view-btn ${isGlobalMode ? 'catalog-view-btn-active' : ''}`}
						onClick={() => { if (!isGlobalMode) handleViewModeToggle(); }}
					>
						<Globe size={16} />
						<span>Общий каталог</span>
					</button>
				</div>
			)}

			{/* Tabs */}
			<div className={`catalog-tabs catalog-tabs-${visibleTabs.length}`}>
				{visibleTabs.map((tab) => (
					<button
						key={tab}
						className={`catalog-tab ${activeTab === tab ? 'catalog-tab-active' : ''} ${tab === 'inactive' ? 'catalog-tab-inactive' : ''}`}
						onClick={() => handleTabChange(tab)}
					>
						{TAB_CONFIG[tab].label}
						{tab === 'inactive' && inactiveBadgeCount > 0 && activeTab !== 'inactive' && (
							<span className="catalog-tab-badge">{inactiveBadgeCount}</span>
						)}
					</button>
				))}
			</div>

			{/* Search and Add */}
			<div className="catalog-search-row">
				<div className="catalog-search">
					<Search className="catalog-search-icon" size={20} />
					<input
						type="text"
						className="catalog-search-input"
						placeholder={getSearchPlaceholder()}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				{canManage && !isInactiveTab && (
					<div className="catalog-action-buttons">
						{isAdmin && !isGlobalMode && selectedBar && (
							<button
								className="catalog-add-btn catalog-add-btn-secondary"
								onClick={() => setShowAssignModal(true)}
								title="Добавить из каталога"
							>
								<PackagePlus size={22} />
							</button>
						)}
						{(isAdmin || selectedBar) && (
							<button
								className="catalog-add-btn"
								onClick={handleAddProduct}
								title={isAdmin ? 'Создать новый продукт' : 'Добавить из каталога'}
							>
								<Plus size={24} />
							</button>
						)}
					</div>
				)}
			</div>

			{/* Category Filter (не для неактивных) */}
			{!isInactiveTab && (
				<CategoryFilter
					categories={filteredCategories}
					selectedCategoryId={selectedCategoryId}
					onSelect={handleCategorySelect}
				/>
			)}

			{/* Products List */}
			{isGlobalMode ? (
				// === ГЛОБАЛЬНЫЙ КАТАЛОГ ===
				isLoading ? (
					<Loading />
				) : currentProducts.length > 0 ? (
					<div className="catalog-list">
						{currentProducts.map((p) => renderProductCard(p, true))}
					</div>
				) : (
					<div className="catalog-empty">
						<p>{tabConfig.emptyText}</p>
					</div>
				)
			) : isInactiveTab ? (
				// === БАР: НЕАКТИВНЫЕ ===
				barInactiveLoading ? (
					<Loading />
				) : filteredInactiveBar.length > 0 ? (
					<div className="catalog-list">
						{filteredInactiveBar.map(renderBarInactiveCard)}
					</div>
				) : (
					<div className="catalog-empty">
						<p>{tabConfig.emptyText}</p>
					</div>
				)
			) : (
				// === БАР: ОБЫЧНЫЕ ТАБЫ ===
				barProductsLoading ? (
					<Loading />
				) : barProductsData && barProductsData.data.length > 0 ? (
					<div className="catalog-list">
						{barProductsData.data.map((p) => renderProductCard(p, false))}
					</div>
				) : (
					<div className="catalog-empty">
						<p>{tabConfig.emptyText}</p>
						{canManage && (
							<button
								className="catalog-empty-btn"
								onClick={() => setShowAssignModal(true)}
							>
								Добавить из каталога
							</button>
						)}
					</div>
				)
			)}

			{/* Modals */}
			<AddProductModal
				isOpen={showAddModal}
				onClose={() => setShowAddModal(false)}
				defaultType={tabConfig.type as ProductType}
			/>

			<AssignProductModal
				isOpen={showAssignModal}
				onClose={() => setShowAssignModal(false)}
				productType={tabConfig.type as ProductType}
			/>

			<EditProductModal
				isOpen={!!editingProduct}
				onClose={() => setEditingProduct(null)}
				product={editingProduct}
			/>

			<EditPriceModal
				isOpen={!!editingPriceProduct}
				onClose={() => setEditingPriceProduct(null)}
				product={editingPriceProduct}
			/>
		</div>
	);
}
