import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { barsApi } from '../../api/bars.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatDate } from '../../utils/format';
import './BarsListPage.css';

export function BarsListPage() {
	const navigate = useNavigate();
	const { data: bars, isLoading } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
	});

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="bars-list-page">
			<div className="page-header-back">
				<Button variant="ghost" onClick={() => navigate('/')} className="page-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
			</div>
			<div className="page-header">
				<h1>Бары</h1>
				<Button variant="primary">Добавить бар</Button>
			</div>

			{bars && bars.length > 0 ? (
				<div className="bars-grid">
					{bars.map((bar) => (
						<Card key={bar.id} title={bar.name}>
							<div className="bar-info">
								<p>
									<strong>Статус:</strong>{' '}
									{bar.isActive ? 'Активен' : 'Неактивен'}
								</p>
								<p>
									<strong>Создан:</strong> {formatDate(bar.createdAt)}
								</p>
							</div>
							<div className="bar-actions">
								<Link to={`/bars/${bar.id}`}>
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
					<p>Бары не найдены</p>
				</Card>
			)}
		</div>
	);
}
