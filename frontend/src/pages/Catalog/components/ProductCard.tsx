import { Edit2, DollarSign } from 'lucide-react';
import type { Product } from '../../../types/common.types';
import { formatCurrency } from '../../../utils/format';

// Category icons mapping
const categoryIcons: Record<string, string> = {
	'Beverages': '🥤',
	'Напитки': '🥤',
	'Snacks': '🍫',
	'Снеки': '🍫',
	'Food': '🥗',
	'Еда': '🥗',
	'Coffee': '☕',
	'Кофе': '☕',
	'Alcohol': '🍺',
	'Алкоголь': '🍺',
	'Desserts': '🍰',
	'Десерты': '🍰',
	'default': '📦',
};

function getCategoryIcon(categoryName?: string): string {
	if (!categoryName) return categoryIcons.default;
	return categoryIcons[categoryName] || categoryIcons.default;
}

interface ProductCardProps {
	product: Product;
	selected?: boolean;
	isActive?: boolean;
	onClick?: () => void;
	onEditProduct?: (product: Product) => void;
	onEditPrice?: (product: Product) => void;
	onToggleActive?: (product: Product, isActive: boolean) => void;
}

export function ProductCard({ product, selected, isActive, onClick, onEditProduct, onEditPrice, onToggleActive }: ProductCardProps) {
	const handleEditProduct = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEditProduct?.(product);
	};

	const handleEditPrice = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEditPrice?.(product);
	};

	const handleToggleActive = (e: React.MouseEvent) => {
		e.stopPropagation();
		onToggleActive?.(product, !isActive);
	};

	return (
		<div
			className={`product-card ${selected ? 'product-card-selected' : ''} ${isActive === false ? 'product-card-inactive' : ''}`}
			onClick={onClick}
		>
			<div className="product-card-icon">
				{getCategoryIcon(product.category?.name)}
			</div>

			<div className="product-card-info">
				<h3 className="product-card-name">{product.name}</h3>
				<p className="product-card-meta">
					{product.category?.name || 'Без категории'}
				</p>
				<div className="product-card-price">
					{product.price != null ? formatCurrency(product.price) : (product.defaultPrice != null ? formatCurrency(product.defaultPrice) : '—')}
				</div>
			</div>

			{(onEditProduct || onEditPrice || onToggleActive) && (
				<div className="card-actions">
					{onToggleActive && (
						<button
							className={`card-action-btn card-action-btn-toggle ${isActive ? 'active' : 'inactive'}`}
							onClick={handleToggleActive}
							title={isActive ? 'Скрыть из ассортимента' : 'Вернуть в ассортимент'}
						>
							<div className={`toggle-switch ${isActive ? 'toggle-on' : 'toggle-off'}`}>
								<div className="toggle-knob" />
							</div>
						</button>
					)}
					{onEditProduct && (
						<button className="card-action-btn" onClick={handleEditProduct} title="Редактировать">
							<Edit2 size={16} />
						</button>
					)}
					{onEditPrice && (
						<button className="card-action-btn card-action-btn-price" onClick={handleEditPrice} title="Изменить цену">
							<DollarSign size={16} />
						</button>
					)}
				</div>
			)}
		</div>
	);
}
