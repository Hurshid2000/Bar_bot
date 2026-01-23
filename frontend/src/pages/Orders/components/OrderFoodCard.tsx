import { Plus, Minus, UtensilsCrossed } from 'lucide-react';
import type { Product } from '../../../types/common.types';

const foodIcons: Record<string, string> = {
	'Завтраки': '🍳',
	'Обеды': '🍽️',
	'Десерты': '🍰',
	'default': '🍴',
};

function getFoodIcon(categoryName?: string): string {
	if (!categoryName) return foodIcons.default;
	return foodIcons[categoryName] || foodIcons.default;
}

interface OrderFoodCardProps {
	product: Product;
	quantity: number;
	onQuantityChange: (productId: string, quantity: number) => void;
}

export function OrderFoodCard({ product, quantity, onQuantityChange }: OrderFoodCardProps) {
	const handleIncrement = (e: React.MouseEvent) => {
		e.stopPropagation();
		onQuantityChange(product.id, quantity + 1);
	};

	const handleDecrement = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (quantity > 0) {
			onQuantityChange(product.id, quantity - 1);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value) || 0;
		if (value >= 0) {
			onQuantityChange(product.id, value);
		}
	};

	return (
		<div className={`order-food-card ${quantity > 0 ? 'order-food-card-selected' : ''}`}>
			<div className="order-food-card-image">
				{product.imageUrl ? (
					<img src={product.imageUrl} alt={product.name} />
				) : (
					<span className="order-food-card-icon">{getFoodIcon(product.category?.name)}</span>
				)}
			</div>

			<div className="order-food-card-content">
				<div className="order-food-card-header">
					<h3 className="order-food-card-name">{product.name}</h3>
				</div>

				<div className="order-food-card-meta">
					<span className="order-food-card-category">
						<UtensilsCrossed size={12} />
						{product.category?.name || 'Без категории'}
					</span>
				</div>

				<div className="order-food-card-quantity">
					<button
						className="order-quantity-btn order-quantity-btn-minus"
						onClick={handleDecrement}
						disabled={quantity === 0}
					>
						<Minus size={16} />
					</button>
					<input
						type="number"
						className="order-quantity-input"
						value={quantity}
						onChange={handleInputChange}
						min="0"
					/>
					<button
						className="order-quantity-btn order-quantity-btn-plus"
						onClick={handleIncrement}
					>
						<Plus size={16} />
					</button>
				</div>
			</div>
		</div>
	);
}
