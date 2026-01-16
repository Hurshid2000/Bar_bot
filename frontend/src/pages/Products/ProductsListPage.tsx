import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productsApi } from '../../api/products.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/format';
import './ProductsListPage.css';

export function ProductsListPage() {
	const { data, isLoading } = useQuery({
		queryKey: ['products'],
		queryFn: () => productsApi.getAll({ page: 1, limit: 50 }),
	});

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="products-list-page">
			<div className="page-header">
				<h1>Продукты</h1>
				<Button variant="primary">Добавить продукт</Button>
			</div>

			{data && data.data.length > 0 ? (
				<div className="products-list">
					{data.data.map((product) => (
						<Card key={product.id}>
							<div className="product-info">
								<h3>{product.name}</h3>
								<p>
									<strong>Цена:</strong> {formatCurrency(product.price)}
								</p>
								<p>
									<strong>Себестоимость:</strong>{' '}
									{formatCurrency(product.costPrice)}
								</p>
								{product.barcode && (
									<p>
										<strong>Штрих-код:</strong> {product.barcode}
									</p>
								)}
							</div>
							<div className="product-actions">
								<Link to={`/products/${product.id}`}>
									<Button variant="outline" size="sm">
										Подробнее
									</Button>
								</Link>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p>Продукты не найдены</p>
				</Card>
			)}
		</div>
	);
}
