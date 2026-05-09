import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
    @ApiProperty({ description: 'Nome do admin', example: 'Rafael Santos' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Email do admin', example: 'admin@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Senha do admin', example: 'Str0ngP@ss!' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ description: 'Role do admin', example: 'admin', required: false })
    @IsOptional()
    @IsString()
    role?: string;
}
