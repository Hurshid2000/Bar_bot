import { UtensilsCrossed } from 'lucide-react';
import type { Product } from '../../../types/common.types';
import { formatCurrency } from '../../../utils/format';

// Category icons mapping for food
const foodIcons: Record<string, string> = {
	'Завтраки': '🍳',
	'Breakfast': '🍳',
	'Обеды': '🍽️',
	'Lunch': '🍽️',
	'Ужины': '🥘',
	'Dinner': '🥘',
	'Салаты': '🥗',
	'Salads': '🥗',
	'Супы': '🍜',
	'Soups': '🍜',
	'Десерты': '🍰',
	'Desserts': '🍰',
	'Напитки': '🥤',
	'Drinks': '🥤',
	'Выпечка': '🥐',
	'Bakery': '🥐',
	'default': '🍴',
};

function getFoodIcon(categoryName?: string): string {
	if (!categoryName) return foodIcons.default;
	return foodIcons[categoryName] || foodIcons.default;
}

interface FoodCardProps {
	product: Product;
	onClick?: () => void;
}

export function FoodCard({ product, onClick }: FoodCardProps) {
	const hasImage = !!product.imageUrl;

	return (
		<div className="food-card" onClick={onClick}>
			<div className="food-card-image">
				{hasImage ? (
					<img src={product.imageUrl} alt={product.name} />
				) : (
					<span className="food-card-icon">{getFoodIcon(product.category?.name)}</span>
				)}
			</div>

			<div className="food-card-content">
				<div className="food-card-header">
					<h3 className="food-card-name">{product.name}</h3>
					<div className="food-card-price">
						{product.price != null ? formatCurrency(product.price) : '—'}
					</div>
				</div>

				<div className="food-card-meta">
					<span className="food-card-category">
						<UtensilsCrossed size={12} />
						{product.category?.name || 'Без категории'}
					</span>
				</div>

				{product.description && (
					<p className="food-card-description">{product.description}</p>
				)}
			</div>
		</div>
	);
}
