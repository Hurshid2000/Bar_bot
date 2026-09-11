import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, parsePurchaseItem } from '../../api/purchases.api';
import type { Purchase } from '../../types/common.types';
import { useBar } from '../../context/BarContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/format';
import './PurchasesListPage.css';

export function PurchasesListPage() {
	const { selectedBar } = useBar();
	const queryClient = useQueryClient();

	const [editing, setEditing] = useState<Purchase | null>(null);
	const [editQuantities, setEditQuantities] = useState<Record<number, number>>({});
	const [deleting, setDeleting] = useState<Purchase | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ['purchases', selectedBar?.id],
		queryFn: () => purchasesApi.getAll({ barId: selectedBar?.id, page: 1, limit: 100 }),
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchases'] });

	const updateMutation = useMutation({
		mutationFn: (vars: { id: string; items: { productId: string; quantity: number }[] }) =>
			purchasesApi.update(vars.id, { items: vars.items }),
		onSuccess: async () => {
			await invalidate();
			setEditing(null);
		},
		onError: (e: any) => alert(`Ошибка: ${e?.data?.message || e?.message || 'не удалось сохранить'}`),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => purchasesApi.remove(id),
		onSuccess: async () => {
			await invalidate();
			setDeleting(null);
		},
		onError: (e: any) => alert(`Ошибка: ${e?.data?.message || e?.message || 'не удалось удалить'}`),
	});

	const openEdit = (purchase: Purchase) => {
		const q: Record<number, number> = {};
		purchase.items.forEach((item, idx) => {
			q[idx] = parsePurchaseItem(item).quantity;
		});
		setEditQuantities(q);
		setEditing(purchase);
	};

	const canEdit = (purchase: Purchase) =>
		purchase.items.every((item) => !!parsePurchaseItem(item).productId);

	const handleSaveEdit = () => {
		if (!editing) return;
		const items = editing.items.map((item, idx) => {
			const parsed = parsePurchaseItem(item);
			return { productId: parsed.productId!, quantity: editQuantities[idx] ?? parsed.quantity };
		});
		if (items.some((i) => !i.productId || i.quantity < 1)) {
			alert('Количество должно быть не меньше 1, и все позиции должны быть из каталога.');
			return;
		}
		updateMutation.mutate({ id: editing.id, items });
	};

	if (isLoading) return <Loading />;

	const purchases = data?.data ?? [];

	return (
		<div className="purchases-list-page">
			<div className="page-header">
				<h1>Закупки</h1>
			</div>

			{purchases.length === 0 ? (
				<Card>
					<p>Закупки не найдены. Добавить закуп можно через бота.</p>
				</Card>
			) : (
				<div className="purchases-list">
					{purchases.map((purchase) => (
						<Card key={purchase.id}>
							<div className="purchase-head">
								<span className="purchase-date">{formatDate(purchase.createdAt)}</span>
								<span className="purchase-total">{formatCurrency(purchase.totalAmount)}</span>
							</div>
							<ul className="purchase-items">
								{purchase.items.map((item) => {
									const p = parsePurchaseItem(item);
									return (
										<li key={item.id}>
											{p.productName} ×{p.quantity}
											{p.price > 0 && (
												<span className="purchase-item-sum">
													{' '}
													= {formatCurrency(p.price * p.quantity)}
												</span>
											)}
										</li>
									);
								})}
							</ul>
							<div className="purchase-actions">
								<Button
									variant="outline"
									size="sm"
									onClick={() => openEdit(purchase)}
									disabled={!canEdit(purchase)}
									title={canEdit(purchase) ? undefined : 'Старая запись без привязки к товарам — правка недоступна'}
								>
									Изменить
								</Button>
								<Button variant="danger" size="sm" onClick={() => setDeleting(purchase)}>
									Удалить
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* Модалка правки количеств */}
			<Modal
				isOpen={!!editing}
				onClose={() => setEditing(null)}
				title="Изменить закуп"
				footer={
					<>
						<Button variant="ghost" onClick={() => setEditing(null)}>
							Отмена
						</Button>
						<Button variant="primary" onClick={handleSaveEdit} loading={updateMutation.isPending}>
							Сохранить
						</Button>
					</>
				}
			>
				{editing && (
					<div className="purchase-edit-list">
						{editing.items.map((item, idx) => {
							const p = parsePurchaseItem(item);
							return (
								<div key={item.id} className="purchase-edit-row">
									<span className="purchase-edit-name">{p.productName}</span>
									<Input
										type="number"
										min={1}
										value={editQuantities[idx] ?? p.quantity}
										onChange={(e) =>
											setEditQuantities((prev) => ({
												...prev,
												[idx]: Math.max(1, Number(e.target.value) || 1),
											}))
										}
									/>
								</div>
							);
						})}
						<p className="purchase-edit-hint">
							Сумма пересчитается автоматически по продажным ценам.
						</p>
					</div>
				)}
			</Modal>

			{/* Модалка удаления */}
			<Modal
				isOpen={!!deleting}
				onClose={() => setDeleting(null)}
				title="Удалить закуп?"
				footer={
					<>
						<Button variant="ghost" onClick={() => setDeleting(null)}>
							Отмена
						</Button>
						<Button
							variant="danger"
							onClick={() => deleting && deleteMutation.mutate(deleting.id)}
							loading={deleteMutation.isPending}
						>
							Удалить
						</Button>
					</>
				}
			>
				{deleting && (
					<p>
						Закуп от {formatDate(deleting.createdAt)} на {formatCurrency(deleting.totalAmount)} будет
						удалён. Действие необратимо.
					</p>
				)}
			</Modal>
		</div>
	);
}
