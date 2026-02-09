import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Check } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { productsApi } from '../../../api/products.api';
import { barProductsApi } from '../../../api/barProducts.api';
import { useBar } from '../../../context/BarContext';
import { ProductType, type Product } from '../../../types/common.types';
import { formatCurrency } from '../../../utils/format';
import './AssignProductModal.css';

interface AssignProductModalProps {
	isOpen: boolean;
	onClose: () => void;
	productType?: ProductType;
}

interface ProductToAssign {
	product: Product;
	price: number;
	selected: boolean;
}

export function AssignProductModal({ isOpen, onClose, productType }: AssignProductModalProps) {
	const queryClient = useQueryClient();
	const { selectedBar } = useBar();
	const [searchQuery, setSearchQuery] = useState('');
	const [productsToAssign, setProductsToAssign] = useState<Map<string, ProductToAssign>>(new Map());

	// Fetch all products (not assigned to bar yet or all)
	const { data: allProducts, isLoading } = useQuery({
		queryKey: ['products', 'all', productType],
		queryFn: () => productsApi.getAll({ type: productType, limit: 100 }),
		enabled: isOpen,
	});

	// Fetch products already in the bar
	const { data: barProducts } = useQuery({
		queryKey: ['bar-products', selectedBar?.id],
		queryFn: () => barProductsApi.getByBar(selectedBar!.id),
		enabled: isOpen && !!selectedBar,
	});

	// Filter products that are not yet assigned to the bar
	const availableProducts = useMemo(() => {
		if (!allProducts?.data) return [];
		const assignedIds = new Set(barProducts?.map((bp) => bp.productId) || []);
		return allProducts.data.filter((p) => !assignedIds.has(p.id));
	}, [allProducts, barProducts]);

	// Filter by search
	const filteredProducts = useMemo(() => {
		if (!searchQuery.trim()) return availableProducts;
		const query = searchQuery.toLowerCase();
		return availableProducts.filter(
			(p) =>
				p.name.toLowerCase().includes(query) ||
				p.barcode?.toLowerCase().includes(query)
		);
	}, [availableProducts, searchQuery]);

	const assignMutation = useMutation({
		mutationFn: (products: { productId: string; price: number }[]) =>
			barProductsApi.bulkAssign(selectedBar!.id, products),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			queryClient.invalidateQueries({ queryKey: ['bar-products'] });
			handleClose();
		},
	});

	const handleClose = () => {
		setSearchQuery('');
		setProductsToAssign(new Map());
		onClose();
	};

	const toggleProduct = (product: Product) => {
		setProductsToAssign((prev) => {
			const newMap = new Map(prev);
			if (newMap.has(product.id)) {
				newMap.delete(product.id);
			} else {
				newMap.set(product.id, {
					product,
					price: product.costPrice * 1.5, // Default markup 50%
					selected: true,
				});
			}
			return newMap;
		});
	};

	const updatePrice = (productId: string, price: number) => {
		setProductsToAssign((prev) => {
			const newMap = new Map(prev);
			const item = newMap.get(productId);
			if (item) {
				newMap.set(productId, { ...item, price });
			}
			return newMap;
		});
	};

	const handleSubmit = () => {
		const products = Array.from(productsToAssign.values()).map((item) => ({
			productId: item.product.id,
			price: item.price,
		}));

		if (products.length === 0) {
			handleClose();
			return;
		}

		assignMutation.mutate(products);
	};

	const selectedCount = productsToAssign.size;

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Добавить в бар">
			<div className="assign-modal">
				<div className="assign-search">
					<Search className="assign-search-icon" size={18} />
					<input
						type="text"
						className="assign-search-input"
						placeholder="Поиск продуктов..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="assign-products-list">
					{isLoading ? (
						<p className="assign-loading">Загрузка...</p>
					) : filteredProducts.length === 0 ? (
						<p className="assign-empty">
							{availableProducts.length === 0
								? 'Все продукты уже добавлены в бар'
								: 'Продукты не найдены'}
						</p>
					) : (
						filteredProducts.map((product) => {
							const isSelected = productsToAssign.has(product.id);
							const assignItem = productsToAssign.get(product.id);

							return (
								<div
									key={product.id}
									className={`assign-product-item ${isSelected ? 'assign-product-selected' : ''}`}
								>
									<div
										className="assign-product-info"
										onClick={() => toggleProduct(product)}
									>
										<div className={`assign-checkbox ${isSelected ? 'assign-checkbox-checked' : ''}`}>
											{isSelected && <Check size={14} />}
										</div>
										<div className="assign-product-details">
											<span className="assign-product-name">{product.name}</span>
											<span className="assign-product-meta">
												{product.category?.name} • Себест.: {formatCurrency(product.costPrice)}
											</span>
										</div>
									</div>

									{isSelected && (
										<div className="assign-price-input">
											<Input
												type="number"
												value={assignItem?.price || 0}
												onChange={(e) => updatePrice(product.id, parseFloat(e.target.value) || 0)}
												min={0}
												placeholder="Цена"
											/>
										</div>
									)}
								</div>
							);
						})
					)}
				</div>

				<div className="assign-footer">
					<span className="assign-selected-count">
						Выбрано: {selectedCount}
					</span>
					<div className="assign-actions">
						<Button variant="outline" onClick={handleClose}>
							Отмена
						</Button>
						<Button
							onClick={handleSubmit}
							loading={assignMutation.isPending}
							disabled={selectedCount === 0}
						>
							Добавить
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
