import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categories.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import './CategoriesListPage.css';

export function CategoriesListPage() {
	const { data: categories, isLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: () => categoriesApi.getAll(),
	});

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="categories-list-page">
			<div className="page-header">
				<h1>Категории</h1>
				<Button variant="primary">Добавить категорию</Button>
			</div>

			{categories && categories.length > 0 ? (
				<div className="categories-list">
					{categories.map((category) => (
						<Card key={category.id}>
							<h3>{category.name}</h3>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p>Категории не найдены</p>
				</Card>
			)}
		</div>
	);
}
