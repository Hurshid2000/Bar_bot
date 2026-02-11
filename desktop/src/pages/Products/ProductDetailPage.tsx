import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/format';
import './ProductDetailPage.css';

export function ProductDetailPage() {
	const { id } = useParams<{ id: string }>();

	const { data: product, isLoading } = useQuery({
		queryKey: ['products', id],
		queryFn: () => productsApi.getById(id!),
		enabled: !!id,
	});

	if (isLoading) {
		return <Loading />;
	}

	if (!product) {
		return (
			<div>
				<Card>
					<p>Продукт не найден</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="product-detail-page">
			<h1>{product.name}</h1>
			<Card>
				<div className="product-detail-info">
					<p>
						<strong>ID:</strong> {product.id}
					</p>
					{product.price != null && (
						<p>
							<strong>Цена:</strong> {formatCurrency(product.price)}
						</p>
					)}
					<p>
						<strong>Себестоимость:</strong> {formatCurrency(product.costPrice ?? 0)}
					</p>
					<p>
						<strong>Тип:</strong> {product.type}
					</p>
					{product.barcode && (
						<p>
							<strong>Штрих-код:</strong> {product.barcode}
						</p>
					)}
					<p>
						<strong>Создан:</strong> {formatDate(product.createdAt)}
					</p>
				</div>
			</Card>
		</div>
	);
}
