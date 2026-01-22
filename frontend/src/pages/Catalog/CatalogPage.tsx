import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { useBar } from '../../context/BarContext';
import { Loading } from '../../components/ui/Loading';
import { ProductType } from '../../types/common.types';
import { ProductCard } from './components/ProductCard';
import { SportpitCard } from './components/SportpitCard';
import { FoodCard } from './components/FoodCard';
import { CategoryFilter } from './components/CategoryFilter';
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
	const [activeTab, setActiveTab] = useState<TabType>('products');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

	const tabConfig = TAB_CONFIG[activeTab];

	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', selectedBar?.id, tabConfig.type, selectedCategoryId, searchQuery],
		queryFn: () =>
			productsApi.getAll({
				barId: selectedBar?.id,
				type: tabConfig.type,
				categoryId: selectedCategoryId || undefined,
				search: searchQuery || undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !!selectedBar,
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
		// TODO: Open add product modal
		alert('Добавление продукта - Coming soon');
	};

	const getSearchPlaceholder = () => {
		if (activeTab === 'products') return 'Поиск по названию или штрих-коду';
		return 'Поиск по названию';
	};

	const renderProductCard = (product: any) => {
		switch (activeTab) {
			case 'products':
				return <ProductCard key={product.id} product={product} />;
			case 'sportpit':
				return <SportpitCard key={product.id} product={product} />;
			case 'food':
				return <FoodCard key={product.id} product={product} />;
		}
	};

	if (!selectedBar) {
		return (
			<div className="catalog-page">
				<p className="catalog-no-bar">Выберите бар для просмотра каталога</p>
			</div>
		);
	}

	return (
		<div className="catalog-page">
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
				<button className="catalog-add-btn" onClick={handleAddProduct}>
					<Plus size={24} />
				</button>
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
				</div>
			)}
		</div>
	);
}
