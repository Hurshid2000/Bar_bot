import { Tag } from 'lucide-react';
import type { Product } from '../../../types/common.types';

// Default sportpit icons for categories
const sportpitIcons: Record<string, string> = {
	'Протеины': '💪',
	'Proteins': '💪',
	'Аминокислоты': '🧬',
	'Amino Acids': '🧬',
	'Креатин': '⚡',
	'Creatine': '⚡',
	'Витамины': '💊',
	'Vitamins': '💊',
	'Гейнеры': '🏋️',
	'Gainers': '🏋️',
	'Жиросжигатели': '🔥',
	'Fat Burners': '🔥',
	'default': '🏆',
};

function getSportpitIcon(categoryName?: string): string {
	if (!categoryName) return sportpitIcons.default;
	return sportpitIcons[categoryName] || sportpitIcons.default;
}

function formatPrice(price: number): string {
	return price.toLocaleString('ru-RU').replace(/,/g, ' ');
}

interface SportpitCardProps {
	product: Product;
	onClick?: () => void;
}

export function SportpitCard({ product, onClick }: SportpitCardProps) {
	return (
		<div className="sportpit-card" onClick={onClick}>
			<div className="sportpit-card-header">
				<div className="sportpit-card-image">
					{product.imageUrl ? (
						<img src={product.imageUrl} alt={product.name} />
					) : (
						getSportpitIcon(product.category?.name)
					)}
				</div>

				<div className="sportpit-card-info">
					<h3 className="sportpit-card-name">{product.name}</h3>
					<div className="sportpit-card-category">
						<Tag className="sportpit-card-category-icon" />
						<span>{product.category?.name || 'Без категории'}</span>
					</div>
				</div>

				<div className="sportpit-card-price">
					{product.price != null ? formatPrice(product.price) : '—'}
					{product.price != null && <span className="sportpit-card-price-currency">сум</span>}
				</div>
			</div>

			{product.description && (
				<div className="sportpit-card-description">
					<p className="sportpit-card-description-text">{product.description}</p>
				</div>
			)}

			<span className="sportpit-card-label">Информационный каталог</span>
		</div>
	);
}
