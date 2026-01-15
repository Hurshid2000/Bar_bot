import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { RoleType } from '@prisma/client';

export class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	telegramId: string;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsOptional()
	@IsEnum(RoleType)
	role?: RoleType;
}
