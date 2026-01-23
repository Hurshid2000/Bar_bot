import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import './OrdersPage.css';

type OrderMode = 'order' | 'arrival';

export function OrdersPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<OrderMode>('order');

	const handleOrderClick = () => {
		navigate('/orders/create');
	};

	const handleHistoryClick = () => {
		navigate('/orders/history');
	};

	return (
		<div className="orders-page">
			<div className="orders-mode-selector">
				<Button
					variant={mode === 'order' ? 'primary' : 'outline'}
					size="lg"
					className="orders-mode-btn"
					onClick={() => setMode('order')}
				>
					Заказ
				</Button>
				<Button
					variant={mode === 'arrival' ? 'primary' : 'outline'}
					size="lg"
					className="orders-mode-btn"
					onClick={() => setMode('arrival')}
				>
					Приход
				</Button>
			</div>

			{mode === 'order' && (
				<div className="orders-actions">
					<Card className="orders-action-card">
						<h2>Заказ</h2>
						<p>Создайте новый заказ товаров</p>
						<div className="orders-action-buttons">
							<Button variant="primary" size="lg" onClick={handleOrderClick}>
								Заказать
							</Button>
							<Button variant="outline" size="lg" onClick={handleHistoryClick}>
								История
							</Button>
						</div>
					</Card>
				</div>
			)}

			{mode === 'arrival' && (
				<div className="orders-actions">
					<Card className="orders-action-card">
						<h2>Приход</h2>
						<p>Зафиксируйте приход или списание товаров</p>
						<div className="orders-action-buttons">
							<Button variant="primary" size="lg" onClick={() => navigate('/arrivals/create')}>
								Создать приход
							</Button>
						</div>
					</Card>
				</div>
			)}
		</div>
	);
}
