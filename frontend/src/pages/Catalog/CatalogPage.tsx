import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, PackagePlus } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { barProductsApi } from '../../api/barProducts.api';
import { categoriesApi } from '../../api/categories.api';
import { stockApi } from '../../api/stock.api';
import { salesApi } from '../../api/sales.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/format';
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
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<TabType>('products');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [editingPriceProduct, setEditingPriceProduct] = useState<Product | null>(null);
	const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
	const [sellPrice, setSellPrice] = useState('');
	const [sellQuantity, setSellQuantity] = useState('1');
	const [sellError, setSellError] = useState('');

	const isAdmin = hasRole([RoleType.ADMIN]);
	const canManage = hasRole([RoleType.ADMIN, RoleType.MANAGER]);
	const tabConfig = TAB_CONFIG[activeTab];

	// Админ видит глобальный каталог даже без выбранного бара
	const showGlobalCatalog = isAdmin && !selectedBar;

	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', selectedBar?.id, tabConfig.type, selectedCategoryId, searchQuery, canManage],
		queryFn: () =>
			productsApi.getAll({
				barId: selectedBar?.id,
				type: tabConfig.type,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !!selectedBar || isAdmin,
	});

	const { data: categories } = useQuery({
		queryKey: ['categories', tabConfig.type],
		queryFn: () => categoriesApi.getAll({ type: tabConfig.type }),
	});

	// Остатки на складе
	const { data: stockMap } = useQuery({
		queryKey: ['stock-map', selectedBar?.id],
		queryFn: () => stockApi.getStockMap(selectedBar!.id),
		enabled: !!selectedBar,
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

	// Мутация для закрепления/открепления продукта в баре
	const togglePinMutation = useMutation({
		mutationFn: ({ productId, isPinned }: { productId: string; isPinned: boolean }) =>
			barProductsApi.updateByBarAndProduct(selectedBar!.id, productId, { isPinned }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['bar-products'] });
		},
	});

	// Мутация для продажи
	const sellMutation = useMutation({
		mutationFn: (dto: { barId: string; productId: string; quantity: number; price: number }) =>
			salesApi.create(dto),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['stock-map'] });
			queryClient.invalidateQueries({ queryKey: ['sales'] });
			closeSellModal();
		},
		onError: (error: any) => {
			setSellError(error?.message || 'Ошибка при продаже');
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

	const handleTogglePin = (product: Product, isPinned: boolean) => {
		if (!selectedBar) return;
		togglePinMutation.mutate({ productId: product.id, isPinned });
	};

	// Продажа спортпита
	const handleSell = (product: Product) => {
		setSellingProduct(product);
		setSellPrice(String(product.price || product.defaultPrice || ''));
		setSellQuantity('1');
		setSellError('');
	};

	const handleConfirmSell = () => {
		if (!sellingProduct || !selectedBar) return;
		const price = parseFloat(sellPrice);
		const quantity = parseInt(sellQuantity);
		if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity < 1) {
			setSellError('Укажите корректную цену и количество');
			return;
		}
		sellMutation.mutate({
			barId: selectedBar.id,
			productId: sellingProduct.id,
			quantity,
			price,
		});
	};

	const closeSellModal = () => {
		setSellingProduct(null);
		setSellPrice('');
		setSellQuantity('1');
		setSellError('');
	};

	// Получаем isActive из barProducts для продукта
	const getProductIsActive = (product: Product): boolean | undefined => {
		if (!selectedBar) return undefined;
		const bp = product.barProducts?.find((bp) => bp.barId === selectedBar.id);
		return bp?.isActive;
	};

	// Получаем isPinned из barProducts
	const getProductIsPinned = (product: Product): boolean => {
		if (!selectedBar) return false;
		const bp = product.barProducts?.find((bp) => bp.barId === selectedBar.id);
		return bp?.isPinned ?? false;
	};

	const renderProductCard = (product: Product) => {
		const productIsActive = getProductIsActive(product);
		const productIsPinned = getProductIsPinned(product);
		const editProps = {
			onEditProduct: isAdmin ? handleEditProduct : undefined,
			onEditPrice: canManage && selectedBar ? handleEditPrice : undefined,
			onToggleActive: canManage && selectedBar ? handleToggleActive : undefined,
			onTogglePin: canManage && selectedBar ? handleTogglePin : undefined,
			isActive: productIsActive,
			isPinned: productIsPinned,
		};

		switch (activeTab) {
			case 'products':
				return <ProductCard key={product.id} product={product} {...editProps} />;
			case 'sportpit':
				return (
					<SportpitCard
						key={product.id}
						product={product}
						{...editProps}
						stockQuantity={selectedBar ? (stockMap?.[product.id] ?? 0) : undefined}
						onSell={selectedBar && productIsActive !== false ? handleSell : undefined}
					/>
				);
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

			{/* Модалка продажи спортпита */}
			{sellingProduct && (
				<div className="modal-overlay" onClick={closeSellModal}>
					<div className="modal-content sell-modal" onClick={(e) => e.stopPropagation()}>
						<h3>Продажа</h3>
						<p className="sell-modal-product-name">{sellingProduct.name}</p>
						<p className="sell-modal-stock">
							На складе: <strong>{stockMap?.[sellingProduct.id] ?? 0} шт</strong>
						</p>
						<div className="sell-modal-fields">
							<div className="sell-modal-field">
								<label>Цена продажи</label>
								<input
									type="number"
									value={sellPrice}
									onChange={(e) => setSellPrice(e.target.value)}
									placeholder="Цена"
									min="1"
									step="any"
									autoFocus
								/>
							</div>
							<div className="sell-modal-field">
								<label>Количество</label>
								<input
									type="number"
									value={sellQuantity}
									onChange={(e) => setSellQuantity(e.target.value)}
									placeholder="1"
									min="1"
									max={String(stockMap?.[sellingProduct.id] ?? 0)}
								/>
							</div>
						</div>
						{sellPrice && sellQuantity && (
							<div className="sell-modal-total">
								Итого: {formatCurrency((parseFloat(sellPrice) || 0) * (parseInt(sellQuantity) || 0))}
							</div>
						)}
						{sellError && <p className="sell-modal-error">{sellError}</p>}
						<div className="sell-modal-actions">
							<button className="sell-modal-cancel" onClick={closeSellModal}>Отмена</button>
							<button
								className="sell-modal-confirm"
								onClick={handleConfirmSell}
								disabled={sellMutation.isPending}
							>
								{sellMutation.isPending ? 'Продажа...' : 'Подтвердить продажу'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
