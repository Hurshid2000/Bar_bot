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
	onClick?: () => void;
}

export function ProductCard({ product, selected, onClick }: ProductCardProps) {
	return (
		<div
			className={`product-card ${selected ? 'product-card-selected' : ''}`}
			onClick={onClick}
		>
			<div className="product-card-icon">
				{getCategoryIcon(product.category?.name)}
			</div>

			<div className="product-card-info">
				<h3 className="product-card-name">{product.name}</h3>
				<p className="product-card-meta">
					{product.category?.name || 'Без категории'}
					{product.barcode && ` • ${product.barcode}`}
				</p>
			</div>

			<div className="product-card-price">
				{product.price != null ? formatCurrency(product.price) : '—'}
			</div>
		</div>
	);
}
