import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { productsApi, type UpdateProductDto } from '../../../api/products.api';
import { categoriesApi } from '../../../api/categories.api';
import { ProductType, type Product } from '../../../types/common.types';
import './AddProductModal.css';

interface EditProductModalProps {
	isOpen: boolean;
	onClose: () => void;
	product: Product | null;
}

export function EditProductModal({ isOpen, onClose, product }: EditProductModalProps) {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState<UpdateProductDto>({
		name: '',
		barcode: '',
		type: ProductType.PRODUCT,
		costPrice: 0,
		defaultPrice: undefined,
		categoryId: '',
		imageUrl: '',
		description: '',
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Заполняем форму при открытии
	useEffect(() => {
		if (product && isOpen) {
			setFormData({
				name: product.name,
				barcode: product.barcode || '',
				type: product.type,
				costPrice: product.costPrice,
				defaultPrice: product.defaultPrice || undefined,
				categoryId: product.categoryId,
				imageUrl: product.imageUrl || '',
				description: product.description || '',
			});
		}
	}, [product, isOpen]);

	const { data: categories } = useQuery({
		queryKey: ['categories'],
		queryFn: () => categoriesApi.getAll(),
	});

	const updateMutation = useMutation({
		mutationFn: (data: UpdateProductDto) => productsApi.update(product!.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] });
			handleClose();
		},
		onError: (error: any) => {
			setErrors({ submit: error.message || 'Ошибка при обновлении продукта' });
		},
	});

	const handleClose = () => {
		setFormData({
			name: '',
			barcode: '',
			type: ProductType.PRODUCT,
			costPrice: 0,
			defaultPrice: undefined,
			categoryId: '',
			imageUrl: '',
			description: '',
		});
		setErrors({});
		onClose();
	};

	const handleChange = (field: keyof UpdateProductDto, value: string | number | undefined) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: '' }));
	};

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.name?.trim()) {
			newErrors.name = 'Название обязательно';
		}
		if (!formData.categoryId) {
			newErrors.categoryId = 'Выберите категорию';
		}
		if (formData.costPrice != null && formData.costPrice < 0) {
			newErrors.costPrice = 'Себестоимость не может быть отрицательной';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate() || !product) return;

		const data: UpdateProductDto = {
			...formData,
			barcode: formData.barcode || undefined,
			defaultPrice: formData.defaultPrice || undefined,
			imageUrl: formData.imageUrl || undefined,
			description: formData.description || undefined,
		};

		updateMutation.mutate(data);
	};

	const categoryOptions = [
		{ value: '', label: 'Выберите категорию' },
		...(categories?.map((c) => ({ value: c.id, label: c.name })) || []),
	];

	const typeOptions = [
		{ value: ProductType.PRODUCT, label: 'Продукт' },
		{ value: ProductType.SPORT_PIT, label: 'Спортпит' },
		{ value: ProductType.FOOD, label: 'Еда' },
	];

	if (!product) return null;

	return (
		<Modal isOpen={isOpen} onClose={handleClose} title="Редактировать продукт">
			<form onSubmit={handleSubmit} className="add-product-form">
				<Input
					label="Название *"
					value={formData.name || ''}
					onChange={(e) => handleChange('name', e.target.value)}
					error={errors.name}
					placeholder="Например: Coca-Cola 0.5л"
				/>

				<Select
					label="Тип *"
					value={formData.type || ProductType.PRODUCT}
					onChange={(e) => handleChange('type', e.target.value as ProductType)}
					options={typeOptions}
				/>

				<Select
					label="Категория *"
					value={formData.categoryId || ''}
					onChange={(e) => handleChange('categoryId', e.target.value)}
					options={categoryOptions}
					error={errors.categoryId}
				/>

				<Input
					label="Штрих-код"
					value={formData.barcode || ''}
					onChange={(e) => handleChange('barcode', e.target.value)}
					placeholder="4600051000057"
				/>

				<Input
					label="Себестоимость *"
					type="number"
					value={formData.costPrice ?? 0}
					onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
					error={errors.costPrice}
					min={0}
				/>

				<Input
					label="Цена по умолчанию"
					type="number"
					value={formData.defaultPrice ?? ''}
					onChange={(e) => handleChange('defaultPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
					placeholder="Цена для всех баров"
					min={0}
				/>

				{(formData.type === ProductType.SPORT_PIT || formData.type === ProductType.FOOD) && (
					<>
						<Input
							label="URL изображения"
							value={formData.imageUrl || ''}
							onChange={(e) => handleChange('imageUrl', e.target.value)}
							placeholder="https://example.com/image.jpg"
						/>

						<div className="form-field">
							<label className="input-label">Описание</label>
							<textarea
								className="form-textarea"
								value={formData.description || ''}
								onChange={(e) => handleChange('description', e.target.value)}
								placeholder="Описание продукта..."
								rows={3}
							/>
						</div>
					</>
				)}

				{errors.submit && <p className="form-error">{errors.submit}</p>}

				<div className="form-actions">
					<Button type="button" variant="outline" onClick={handleClose}>
						Отмена
					</Button>
					<Button type="submit" loading={updateMutation.isPending}>
						Сохранить
					</Button>
				</div>
			</form>
		</Modal>
	);
}
