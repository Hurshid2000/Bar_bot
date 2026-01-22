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
import { CategoryFilter } from './components/CategoryFilter';
import './CatalogPage.css';

type TabType = 'products' | 'sportpit';

export function CatalogPage() {
	const { selectedBar } = useBar();
	const [activeTab, setActiveTab] = useState<TabType>('products');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

	const productType = activeTab === 'products' ? ProductType.PRODUCT : ProductType.SPORT_PIT;

	const { data: productsData, isLoading: productsLoading } = useQuery({
		queryKey: ['products', selectedBar?.id, productType, selectedCategoryId, searchQuery],
		queryFn: () =>
			productsApi.getAll({
				barId: selectedBar?.id,
				type: productType,
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
		// In a real app, categories would have a type field
		// For now, return all categories
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
			<div className="catalog-tabs">
				<button
					className={`catalog-tab ${activeTab === 'products' ? 'catalog-tab-active' : ''}`}
					onClick={() => handleTabChange('products')}
				>
					Products
				</button>
				<button
					className={`catalog-tab ${activeTab === 'sportpit' ? 'catalog-tab-active' : ''}`}
					onClick={() => handleTabChange('sportpit')}
				>
					Sportpit
				</button>
			</div>

			{/* Search and Add */}
			<div className="catalog-search-row">
				<div className="catalog-search">
					<Search className="catalog-search-icon" size={20} />
					<input
						type="text"
						className="catalog-search-input"
						placeholder={
							activeTab === 'products'
								? 'Поиск по названию или штрих-коду'
								: 'Поиск по названию'
						}
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
					{productsData.data.map((product) =>
						activeTab === 'products' ? (
							<ProductCard key={product.id} product={product} />
						) : (
							<SportpitCard key={product.id} product={product} />
						),
					)}
				</div>
			) : (
				<div className="catalog-empty">
					<p>
						{activeTab === 'products'
							? 'Продукты не найдены'
							: 'Спортпит не найден'}
					</p>
				</div>
			)}
		</div>
	);
}
