import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arrivalsApi } from '../../api/arrivals.api';
import type { Arrival } from '../../types/common.types';
import { useBar } from '../../context/BarContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { formatDate } from '../../utils/format';
import './SportpitPage.css';

const isSportpitArrival = (a: Arrival) =>
	a.items?.some((it) => it.product?.type === 'SPORT_PIT');

export function SportpitArrivalsPage() {
	const { selectedBar } = useBar();
	const queryClient = useQueryClient();

	const [editing, setEditing] = useState<Arrival | null>(null);
	const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
	const [deleting, setDeleting] = useState<Arrival | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ['sportpit-arrivals', selectedBar?.id],
		queryFn: () => arrivalsApi.getAll({ barId: selectedBar?.id, type: 'ARRIVAL', page: 1, limit: 200 }),
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sportpit-arrivals'] });

	const updateMutation = useMutation({
		mutationFn: (vars: { id: string; items: { productId: string; quantity: number }[] }) =>
			arrivalsApi.update(vars.id, { items: vars.items }),
		onSuccess: async () => {
			await invalidate();
			setEditing(null);
		},
		onError: (e: any) => alert(`Ошибка: ${e?.data?.message || e?.message || 'не удалось сохранить'}`),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => arrivalsApi.remove(id),
		onSuccess: async () => {
			await invalidate();
			setDeleting(null);
		},
		onError: (e: any) => alert(`Ошибка: ${e?.data?.message || e?.message || 'не удалось удалить'}`),
	});

	const openEdit = (arrival: Arrival) => {
		const q: Record<string, number> = {};
		arrival.items.forEach((it) => {
			q[it.id] = it.quantity;
		});
		setEditQuantities(q);
		setEditing(arrival);
	};

	const handleSave = () => {
		if (!editing) return;
		const items = editing.items.map((it) => ({
			productId: it.productId,
			quantity: editQuantities[it.id] ?? it.quantity,
		}));
		if (items.some((i) => i.quantity < 1)) {
			alert('Количество должно быть не меньше 1.');
			return;
		}
		updateMutation.mutate({ id: editing.id, items });
	};

	if (isLoading) return <Loading />;

	const arrivals = (data?.data ?? []).filter(isSportpitArrival);

	return (
		<div className="sportpit-page">
			<div className="page-header">
				<h1>Приходы спортпита</h1>
			</div>

			{arrivals.length === 0 ? (
				<Card>
					<p>Приходы спортпита не найдены. Добавить приход можно через бота.</p>
				</Card>
			) : (
				<div className="sportpit-list">
					{arrivals.map((arrival) => (
						<Card key={arrival.id}>
							<div className="sportpit-row-head">
								<span className="sportpit-name">{formatDate(arrival.createdAt)}</span>
								<span className="sportpit-total">
									{arrival.items.reduce((s, it) => s + it.quantity, 0)} шт
								</span>
							</div>
							<ul className="sportpit-items">
								{arrival.items.map((it) => (
									<li key={it.id}>
										{it.product?.name || 'Товар'} ×{it.quantity}
									</li>
								))}
							</ul>
							<div className="sportpit-actions">
								<Button variant="outline" size="sm" onClick={() => openEdit(arrival)}>
									Изменить
								</Button>
								<Button variant="danger" size="sm" onClick={() => setDeleting(arrival)}>
									Удалить
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}

			<Modal
				isOpen={!!editing}
				onClose={() => setEditing(null)}
				title="Изменить приход спортпита"
				footer={
					<>
						<Button variant="ghost" onClick={() => setEditing(null)}>
							Отмена
						</Button>
						<Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>
							Сохранить
						</Button>
					</>
				}
			>
				{editing && (
					<div className="sportpit-edit">
						{editing.items.map((it) => (
							<div key={it.id} className="sportpit-edit-row">
								<span className="sportpit-edit-name">{it.product?.name || 'Товар'}</span>
								<Input
									type="number"
									min={1}
									value={editQuantities[it.id] ?? it.quantity}
									onChange={(e) =>
										setEditQuantities((prev) => ({
											...prev,
											[it.id]: Math.max(1, Number(e.target.value) || 1),
										}))
									}
								/>
							</div>
						))}
						<p className="sportpit-edit-hint">Изменение количеств скорректирует остатки на складе.</p>
					</div>
				)}
			</Modal>

			<Modal
				isOpen={!!deleting}
				onClose={() => setDeleting(null)}
				title="Удалить приход спортпита?"
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
						Приход от {formatDate(deleting.createdAt)} будет удалён, остатки на складе откатятся.
					</p>
				)}
			</Modal>
		</div>
	);
}
