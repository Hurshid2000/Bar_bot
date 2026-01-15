import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { RoleType } from '@prisma/client';

export class UpdateUserDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@IsOptional()
	@IsEnum(RoleType)
	role?: RoleType;
}
