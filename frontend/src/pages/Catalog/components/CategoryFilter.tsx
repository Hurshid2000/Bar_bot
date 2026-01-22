import type { Category } from '../../../types/common.types';

interface CategoryFilterProps {
	categories: Category[];
	selectedCategoryId: string | null;
	onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({
	categories,
	selectedCategoryId,
	onSelect,
}: CategoryFilterProps) {
	if (categories.length === 0) {
		return null;
	}

	return (
		<div className="category-filter">
			<button
				className={`category-chip ${selectedCategoryId === null ? 'category-chip-active' : ''}`}
				onClick={() => onSelect(null)}
			>
				Все
			</button>
			{categories.map((category) => (
				<button
					key={category.id}
					className={`category-chip ${selectedCategoryId === category.id ? 'category-chip-active' : ''}`}
					onClick={() => onSelect(category.id)}
				>
					{category.icon && <span>{category.icon}</span>}
					{category.name}
				</button>
			))}
		</div>
	);
}
