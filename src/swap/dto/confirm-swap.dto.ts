import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmSwapDto {
  /** Mensagem opcional para o counterparty */
  @ApiPropertyOptional({
    description: 'Mensagem opcional para o counterparty',
    example: 'Pronto para trocar!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}
