import { Tag, Edit2, DollarSign, Pin } from 'lucide-react';
import type { Product } from '../../../types/common.types';

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
	isActive?: boolean;
	isPinned?: boolean;
	onClick?: () => void;
	onEditProduct?: (product: Product) => void;
	onEditPrice?: (product: Product) => void;
	onToggleActive?: (product: Product, isActive: boolean) => void;
	onTogglePin?: (product: Product, isPinned: boolean) => void;
}

export function SportpitCard({ product, isActive, isPinned, onClick, onEditProduct, onEditPrice, onToggleActive, onTogglePin }: SportpitCardProps) {
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

	const handleTogglePin = (e: React.MouseEvent) => {
		e.stopPropagation();
		onTogglePin?.(product, !isPinned);
	};

	return (
		<div className={`sportpit-card ${isActive === false ? 'product-card-inactive' : ''} ${isPinned ? 'product-card-pinned' : ''}`} onClick={onClick}>
			{isPinned && <div className="product-card-pin-badge"><Pin size={12} /></div>}

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
					{product.price != null 
						? formatPrice(product.price) 
						: (product.defaultPrice != null ? formatPrice(product.defaultPrice) : '—')}
					{(product.price != null || product.defaultPrice != null) && (
						<span className="sportpit-card-price-currency">сум</span>
					)}
				</div>
			</div>

			{product.description && (
				<div className="sportpit-card-description">
					<p className="sportpit-card-description-text">{product.description}</p>
				</div>
			)}

			{(onEditProduct || onEditPrice || onToggleActive || onTogglePin) && (
				<div className="card-actions">
					{onTogglePin && (
						<button
							className={`card-action-btn card-action-btn-pin ${isPinned ? 'pinned' : ''}`}
							onClick={handleTogglePin}
							title={isPinned ? 'Открепить' : 'Закрепить'}
						>
							<Pin size={16} />
						</button>
					)}
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
