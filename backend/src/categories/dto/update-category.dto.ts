import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateCategoryDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;
}
