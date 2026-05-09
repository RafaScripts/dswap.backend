import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAdminUserDto } from './create-admin-user.dto';

export class UpdateAdminUserDto extends PartialType(CreateAdminUserDto) {
	@ApiPropertyOptional({ description: 'Admin ativo', example: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
