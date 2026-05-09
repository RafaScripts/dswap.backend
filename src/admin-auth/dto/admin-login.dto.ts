import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AdminUserResponseDto } from '../../admin-users/dto/admin-user-response.dto';

export class AdminLoginDto {
  @ApiProperty({ description: 'Email do admin', example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do admin' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class AdminLoginResponseDto {
  @ApiProperty({ description: 'JWT de acesso do admin' })
  accessToken: string;

  @ApiProperty({ description: 'Dados do admin', type: AdminUserResponseDto })
  admin: AdminUserResponseDto;
}
