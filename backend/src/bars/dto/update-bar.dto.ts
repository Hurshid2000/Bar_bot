import { IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateBarDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
