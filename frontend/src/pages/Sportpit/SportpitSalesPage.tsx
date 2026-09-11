import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, type Sale } from '../../api/sales.api';
import { useBar } from '../../context/BarContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/format';
import './SportpitPage.css';

export function SportpitSalesPage() {
	const { selectedBar } = useBar();
	const queryClient = useQueryClient();

	const [editing, setEditing] = useState<Sale | null>(null);
	const [form, setForm] = useState<{ quantity: number; price: number; buyerName: string }>({
		quantity: 1,
		price: 0,
		buyerName: '',
	});
	const [deleting, setDeleting] = useState<Sale | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ['sportpit-sales', selectedBar?.id],
		queryFn: () => salesApi.getAll({ barId: selectedBar?.id, page: 1, limit: 200 }),
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sportpit-sales'] });

	const updateMutation = useMutation({
		mutationFn: (vars: { id: string; quantity: number; price: number; buyerName: string }) =>
			salesApi.update(vars.id, {
				quantity: vars.quantity,
				price: vars.price,
				buyerName: vars.buyerName || undefined,
			}),
		onSuccess: async () => {
			await invalidate();
			setEditing(null);
		},
		onError: (e: any) => alert(`Ошибка: ${e?.data?.message || e?.message || 'не удалось сохранить'}`),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => salesApi.remove(id),
		onSuccess: async () => {
			await invalidate();
			setDeleting(null);
		},
		onError: (e: any) => alert(`Ошибка: ${e?.data?.message || e?.message || 'не удалось удалить'}`),
	});

	const openEdit = (sale: Sale) => {
		setForm({ quantity: sale.quantity, price: sale.price, buyerName: sale.buyerName || '' });
		setEditing(sale);
	};

	const handleSave = () => {
		if (!editing) return;
		if (form.quantity < 1 || form.price <= 0) {
			alert('Количество ≥ 1 и цена больше 0.');
			return;
		}
		updateMutation.mutate({ id: editing.id, ...form });
	};

	if (isLoading) return <Loading />;

	const sales = (data?.data ?? []).filter((s) => s.product?.type === 'SPORT_PIT');

	return (
		<div className="sportpit-page">
			<div className="page-header">
				<h1>Продажи спортпита</h1>
			</div>

			{sales.length === 0 ? (
				<Card>
					<p>Продажи спортпита не найдены. Добавить продажу можно через бота.</p>
				</Card>
			) : (
				<div className="sportpit-list">
					{sales.map((sale) => (
						<Card key={sale.id}>
							<div className="sportpit-row-head">
								<span className="sportpit-name">{sale.product?.name || 'Товар'}</span>
								<span className="sportpit-total">{formatCurrency(sale.total)}</span>
							</div>
							<div className="sportpit-meta">
								{formatDate(sale.date)} · {sale.quantity} × {formatCurrency(sale.price)}
								{sale.buyerName ? ` · ${sale.buyerName}` : ''}
							</div>
							<div className="sportpit-actions">
								<Button variant="outline" size="sm" onClick={() => openEdit(sale)}>
									Изменить
								</Button>
								<Button variant="danger" size="sm" onClick={() => setDeleting(sale)}>
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
				title="Изменить продажу"
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
						<p className="sportpit-edit-name">{editing.product?.name}</p>
						<Input
							label="Количество"
							type="number"
							min={1}
							value={form.quantity}
							onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value) || 1) }))}
						/>
						<Input
							label="Цена за единицу"
							type="number"
							min={0}
							value={form.price}
							onChange={(e) => setForm((f) => ({ ...f, price: Math.max(0, Number(e.target.value) || 0) }))}
						/>
						<Input
							label="Кому (необязательно)"
							value={form.buyerName}
							onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
						/>
						<p className="sportpit-edit-hint">
							Изменение количества скорректирует остаток на складе.
						</p>
					</div>
				)}
			</Modal>

			<Modal
				isOpen={!!deleting}
				onClose={() => setDeleting(null)}
				title="Удалить продажу?"
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
						Продажа «{deleting.product?.name}» ×{deleting.quantity} будет удалена, товар вернётся на
						склад.
					</p>
				)}
			</Modal>
		</div>
	);
}
