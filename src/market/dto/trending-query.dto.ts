import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TrendingQueryDto {
  /** Quantidade máxima de resultados */
  @ApiPropertyOptional({
    description: 'Quantidade máxima de tokens trending retornados',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  /** Período de análise */
  @ApiPropertyOptional({
    description: 'Período de tempo para análise de trending (ex: 24h, 7d, 30d)',
    example: '24h',
    default: '24h',
  })
  @IsOptional()
  @IsString()
  timeWindow?: string;
}
