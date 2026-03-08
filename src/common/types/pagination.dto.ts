import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  /** Número da página (começa em 1) */
  @ApiPropertyOptional({ description: 'Número da página', example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  /** Itens por página */
  @ApiPropertyOptional({ description: 'Itens por página', example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;
}

export class PaginationMeta {
  /** Página atual */
  @ApiPropertyOptional({ example: 1 })
  page: number;

  /** Itens por página */
  @ApiPropertyOptional({ example: 20 })
  limit: number;

  /** Total de itens */
  @ApiPropertyOptional({ example: 150 })
  total: number;

  /** Total de páginas */
  @ApiPropertyOptional({ example: 8 })
  totalPages: number;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
  }
}
