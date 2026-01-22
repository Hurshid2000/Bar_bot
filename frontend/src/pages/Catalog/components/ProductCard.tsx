import { RefreshCw } from 'lucide-react';
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
	const stock = product.stock ?? 0;
	const stockClass = stock === 0 ? 'product-card-stock-out' : stock < 10 ? 'product-card-stock-low' : '';

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
				<div className={`product-card-stock ${stockClass}`}>
					<RefreshCw className="product-card-stock-icon" />
					<span>{stock} шт</span>
				</div>
			</div>

			<div className="product-card-price">
				{formatCurrency(product.price)}
			</div>
		</div>
	);
}
