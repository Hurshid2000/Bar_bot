import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, PackagePlus } from 'lucide-react';
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

	const isAdmin = hasRole([RoleType.ADMIN]);
	const canManage = hasRole([RoleType.ADMIN, RoleType.MANAGER]);
	const tabConfig = TAB_CONFIG[activeTab];
	const isInactiveTab = activeTab === 'inactive';

	// Админ видит глобальный каталог даже без выбранного бара
	const showGlobalCatalog = isAdmin && !selectedBar;

	// Запрос активных товаров (обычные табы)
	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', selectedBar?.id, tabConfig.type, selectedCategoryId, searchQuery, canManage],
		queryFn: () =>
			productsApi.getAll({
				barId: selectedBar?.id,
				type: tabConfig.type as ProductType,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !isInactiveTab && (!!selectedBar || isAdmin),
	});

	// Запрос ВСЕХ товаров бара (включая неактивные) — для таба "Неактивные" и бейджа
	const { data: allBarProducts, isLoading: inactiveLoading } = useQuery({
		queryKey: ['bar-products', selectedBar?.id, 'includeInactive'],
		queryFn: () => barProductsApi.getByBar(selectedBar!.id, true),
		enabled: canManage && !!selectedBar,
	});

	// Фильтруем неактивные
	const inactiveProducts: BarProduct[] = (allBarProducts || []).filter(
		(bp) => !bp.isActive,
	);

	// Фильтрация неактивных по поиску
	const filteredInactive = searchQuery
		? inactiveProducts.filter((bp) =>
				bp.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: inactiveProducts;

	const { data: categories } = useQuery({
		queryKey: ['categories', tabConfig.type],
		queryFn: () => categoriesApi.getAll({ type: tabConfig.type as ProductType }),
		enabled: !isInactiveTab,
	});

	// Мутация для переключения isActive
	const toggleActiveMutation = useMutation({
		mutationFn: ({ productId, isActive }: { productId: string; isActive: boolean }) =>
			barProductsApi.updateByBarAndProduct(selectedBar!.id, productId, { isActive }),
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

	const handleToggleActive = (product: Product, isActive: boolean) => {
		if (!selectedBar) return;
		toggleActiveMutation.mutate({ productId: product.id, isActive });
	};

	// Получаем isActive из barProducts для продукта
	const getProductIsActive = (product: Product): boolean | undefined => {
		if (!selectedBar) return undefined;
		const bp = product.barProducts?.find((bp) => bp.barId === selectedBar.id);
		return bp?.isActive;
	};

	const renderProductCard = (product: Product) => {
		const productIsActive = getProductIsActive(product);
		const editProps = {
			onEditProduct: isAdmin ? handleEditProduct : undefined,
			onEditPrice: canManage && selectedBar ? handleEditPrice : undefined,
			onToggleActive: canManage && selectedBar ? handleToggleActive : undefined,
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

	const renderInactiveCard = (bp: BarProduct) => {
		if (!bp.product) return null;
		const product: Product = {
			...bp.product,
			price: bp.price,
			barProducts: [bp],
		};
		return renderProductCard(product);
	};

	// Табы для отображения
	const visibleTabs: TabType[] = canManage && selectedBar
		? ['products', 'sportpit', 'food', 'inactive']
		: ['products', 'sportpit', 'food'];

	// Не-админы должны выбрать бар
	if (!selectedBar && !isAdmin) {
		return (
			<div className="catalog-page">
				<p className="catalog-no-bar">Выберите бар для просмотра каталога</p>
			</div>
		);
	}

	return (
		<div className="catalog-page">
			{/* Global Catalog Banner */}
			{showGlobalCatalog && (
				<div className="catalog-global-banner">
					Глобальный каталог — продукты будут добавлены во все бары
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
						{tab === 'inactive' && inactiveProducts.length > 0 && activeTab !== 'inactive' && (
							<span className="catalog-tab-badge">{inactiveProducts.length}</span>
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
						{isAdmin && selectedBar && (
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
			{isInactiveTab ? (
				inactiveLoading ? (
					<Loading />
				) : filteredInactive.length > 0 ? (
					<div className="catalog-list">
						{filteredInactive.map(renderInactiveCard)}
					</div>
				) : (
					<div className="catalog-empty">
						<p>{tabConfig.emptyText}</p>
					</div>
				)
			) : productsLoading ? (
				<Loading />
			) : productsData && productsData.data.length > 0 ? (
				<div className="catalog-list">
					{productsData.data.map(renderProductCard)}
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
