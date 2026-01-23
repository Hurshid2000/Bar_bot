import { Plus, Minus, Tag } from 'lucide-react';
import type { Product } from '../../../types/common.types';

const sportpitIcons: Record<string, string> = {
	'Протеин': '💪',
	'Витамины': '💊',
	'Гейнеры': '🏋️',
	'default': '🏆',
};

function getSportpitIcon(categoryName?: string): string {
	if (!categoryName) return sportpitIcons.default;
	return sportpitIcons[categoryName] || sportpitIcons.default;
}

interface OrderSportpitCardProps {
	product: Product;
	quantity: number;
	onQuantityChange: (productId: string, quantity: number) => void;
}

export function OrderSportpitCard({ product, quantity, onQuantityChange }: OrderSportpitCardProps) {
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
		<div className={`order-sportpit-card ${quantity > 0 ? 'order-sportpit-card-selected' : ''}`}>
			<div className="order-sportpit-card-header">
				<div className="order-sportpit-card-image">
					{product.imageUrl ? (
						<img src={product.imageUrl} alt={product.name} />
					) : (
						getSportpitIcon(product.category?.name)
					)}
				</div>

				<div className="order-sportpit-card-info">
					<h3 className="order-sportpit-card-name">{product.name}</h3>
					<div className="order-sportpit-card-category">
						<Tag className="order-sportpit-card-category-icon" />
						<span>{product.category?.name || 'Без категории'}</span>
					</div>
				</div>
			</div>

			<div className="order-sportpit-card-quantity">
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
	);
}
