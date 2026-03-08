import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QuotesQueryDto {
  /** IDs do CoinMarketCap separados por vírgula (ex: "1,2,1027") */
  @ApiPropertyOptional({
    description: 'IDs do CoinMarketCap separados por vírgula',
    example: '1,2,1027',
  })
  @IsOptional()
  @IsString()
  ids?: string;

  /** Symbols separados por vírgula (ex: "BTC,ETH") */
  @ApiPropertyOptional({
    description: 'Symbols dos tokens separados por vírgula (alternativa a ids)',
    example: 'BTC,ETH,USDC',
  })
  @IsOptional()
  @IsString()
  symbols?: string;

  /** Moeda de conversão (padrão: USD) */
  @ApiPropertyOptional({
    description: 'Moeda de conversão para os preços',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  convert?: string;
}
