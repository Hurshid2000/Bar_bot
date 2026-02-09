import { useQuery } from '@tanstack/react-query';
import { purchasesApi } from '../../api/purchases.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/format';
import './PurchasesListPage.css';

export function PurchasesListPage() {
	const { data, isLoading } = useQuery({
		queryKey: ['purchases'],
		queryFn: () => purchasesApi.getAll({ page: 1, limit: 50 }),
	});

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="purchases-list-page">
			<div className="page-header">
				<h1>Закупки</h1>
				<Button variant="primary">Добавить закупку</Button>
			</div>

			{data && data.data.length > 0 ? (
				<div className="purchases-list">
					{data.data.map((purchase) => (
						<Card key={purchase.id}>
							<div className="purchase-info">
								<p>
									<strong>Сумма:</strong> {formatCurrency(purchase.totalAmount)}
								</p>
								<p>
									<strong>Товаров:</strong> {purchase.items.length}
								</p>
								<p>
									<strong>Дата:</strong> {formatDate(purchase.createdAt)}
								</p>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p>Закупки не найдены</p>
				</Card>
			)}
		</div>
	);
}
