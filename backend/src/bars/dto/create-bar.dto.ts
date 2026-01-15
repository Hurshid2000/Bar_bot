import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBarDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
