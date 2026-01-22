import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, PackagePlus } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { ProductType, RoleType, type Product } from '../../types/common.types';
import { ProductCard } from './components/ProductCard';
import { SportpitCard } from './components/SportpitCard';
import { FoodCard } from './components/FoodCard';
import { CategoryFilter } from './components/CategoryFilter';
import { AddProductModal } from './components/AddProductModal';
import { AssignProductModal } from './components/AssignProductModal';
import { EditProductModal } from './components/EditProductModal';
import { EditPriceModal } from './components/EditPriceModal';
import './CatalogPage.css';

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

export function CatalogPage() {
	const { selectedBar } = useBar();
	const { hasRole } = useAuth();
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

	// Админ видит глобальный каталог даже без выбранного бара
	const showGlobalCatalog = isAdmin && !selectedBar;

	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', selectedBar?.id, tabConfig.type, selectedCategoryId, searchQuery],
		queryFn: () =>
			productsApi.getAll({
				barId: selectedBar?.id, // undefined для глобального каталога
				type: tabConfig.type,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !!selectedBar || isAdmin, // Админ может видеть без бара
	});

	const { data: categories } = useQuery({
		queryKey: ['categories'],
		queryFn: () => categoriesApi.getAll(),
	});

	// Filter categories based on active tab type
	const filteredCategories = useMemo(() => {
		if (!categories) return [];
		return categories;
	}, [categories]);

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
			// Admin can create new global products
			setShowAddModal(true);
		} else if (canManage) {
			// Manager can assign existing products to bar
			setShowAssignModal(true);
		}
	};

	const getSearchPlaceholder = () => {
		if (activeTab === 'products') return 'Поиск по названию или штрих-коду';
		return 'Поиск по названию';
	};

	const handleEditProduct = (product: Product) => {
		setEditingProduct(product);
	};

	const handleEditPrice = (product: Product) => {
		setEditingPriceProduct(product);
	};

	const renderProductCard = (product: Product) => {
		const editProps = {
			onEditProduct: isAdmin ? handleEditProduct : undefined,
			onEditPrice: canManage && selectedBar ? handleEditPrice : undefined,
		};

		switch (activeTab) {
			case 'products':
				return <ProductCard key={product.id} product={product} {...editProps} />;
			case 'sportpit':
				return <SportpitCard key={product.id} product={product} {...editProps} />;
			case 'food':
				return <FoodCard key={product.id} product={product} {...editProps} />;
		}
	};

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
			<div className="catalog-tabs catalog-tabs-3">
				{(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
					<button
						key={tab}
						className={`catalog-tab ${activeTab === tab ? 'catalog-tab-active' : ''}`}
						onClick={() => handleTabChange(tab)}
					>
						{TAB_CONFIG[tab].label}
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
				{canManage && (
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
				defaultType={tabConfig.type}
			/>

			<AssignProductModal
				isOpen={showAssignModal}
				onClose={() => setShowAssignModal(false)}
				productType={tabConfig.type}
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
