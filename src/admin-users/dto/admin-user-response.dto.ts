import { ApiProperty } from '@nestjs/swagger';

export class AdminUserResponseDto {
  @ApiProperty({ description: 'ID do admin (UUID)' })
  id: string;

  @ApiProperty({ description: 'Nome do admin' })
  name: string;

  @ApiProperty({ description: 'Email do admin' })
  email: string;

  @ApiProperty({ description: 'Role do admin', example: 'admin' })
  role: string;

  @ApiProperty({ description: 'Admin ativo', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Data de criacao' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualizacao' })
  updatedAt: Date;
}
