import type { Product } from '../../../types/common.types';
import { formatCurrency } from '../../../utils/format';

const categoryIcons: Record<string, string> = {
	'Напитки': '🥤',
	'Снеки': '🍫',
	'Алкоголь': '🍺',
	'default': '📦',
};

function getCategoryIcon(categoryName?: string): string {
	if (!categoryName) return categoryIcons.default;
	return categoryIcons[categoryName] || categoryIcons.default;
}

interface OrderProductCardProps {
	product: Product;
	quantity: number;
	onQuantityChange: (productId: string, quantity: number) => void;
	showPrice?: boolean;
}

export function OrderProductCard({ product, quantity, onQuantityChange, showPrice }: OrderProductCardProps) {
	const unitPrice = product.barProducts?.[0]?.price ?? product.defaultPrice ?? product.costPrice ?? 0;
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
		const raw = e.target.value;
		const value = raw === '' ? 0 : parseInt(raw, 10);
		if (!Number.isNaN(value) && value >= 0) {
			onQuantityChange(product.id, value);
		}
	};

	return (
		<div className={`order-product-card ${quantity > 0 ? 'order-product-card-selected' : ''}`}>
			<div className="order-product-card-icon">
				{getCategoryIcon(product.category?.name)}
			</div>

			<div className="order-product-card-content">
				<div className="order-product-card-info">
					<h3 className="order-product-card-name">{product.name}</h3>
					<p className="order-product-card-meta">
						{product.category?.name || 'Без категории'}
					</p>
					{showPrice && (
						<p className="order-product-card-meta">
							{formatCurrency(unitPrice)}
							{quantity > 0 && (
								<span style={{ color: 'var(--color-primary-400)', fontWeight: 600 }}>
									{' · '}
									{formatCurrency(unitPrice * quantity)}
								</span>
							)}
						</p>
					)}
				</div>

				<div className="order-product-card-quantity">
					<button
						className="order-quantity-btn order-quantity-btn-minus"
						onClick={handleDecrement}
						disabled={quantity === 0}
					>
						−
					</button>
					<input
						type="number"
						className="order-quantity-input"
						value={quantity === 0 ? '' : quantity}
						onChange={handleInputChange}
						onFocus={(e) => e.target.select()}
						placeholder="0"
						min="0"
					/>
					<button
						className="order-quantity-btn order-quantity-btn-plus"
						onClick={handleIncrement}
					>
						+
					</button>
				</div>
			</div>
		</div>
	);
}
