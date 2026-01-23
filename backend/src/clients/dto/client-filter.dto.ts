import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ClientFilterDto {
	@ApiPropertyOptional({ description: 'ID бара для фильтрации' })
	@IsOptional()
	@IsString()
	barId?: string;

	@ApiPropertyOptional({ description: 'Поиск по имени или телефону' })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ description: 'Фильтр по активности', type: Boolean })
	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	isActive?: boolean;

	@ApiPropertyOptional({ description: 'Сортировка по балансу: debt (должники), deposit (депозитники)', example: 'debt' })
	@IsOptional()
	@IsString()
	sortBy?: 'debt' | 'deposit' | 'all'; // debt - отрицательный баланс, deposit - положительный, all - все

	@ApiPropertyOptional({ description: 'Номер страницы', default: 1, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({ description: 'Количество элементов на странице', default: 20, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number;
}
