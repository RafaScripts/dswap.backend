import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenBalanceDto {
  /** Contract address do token (ou "NATIVE" para ETH/SOL/etc) */
  @ApiProperty({
    description: 'Contract address do token (ou "NATIVE" para moeda nativa)',
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  })
  token: string;

  /** Símbolo do token */
  @ApiProperty({ description: 'Símbolo do token', example: 'USDC' })
  symbol: string;

  /** Nome do token */
  @ApiProperty({ description: 'Nome do token', example: 'USD Coin' })
  name: string;

  /** Balance em unidades do token (não em wei) */
  @ApiProperty({
    description: 'Balance em unidades do token (formatado, não em wei)',
    example: '1500.50',
  })
  balance: string;

  /** Decimais do token */
  @ApiProperty({ description: 'Número de decimais do token', example: 6 })
  decimals: number;

  /** Preço unitário em USD */
  @ApiPropertyOptional({ description: 'Preço unitário em USD', example: 1.0 })
  priceUsd?: number;

  /** Valor total em USD */
  @ApiPropertyOptional({ description: 'Valor total da posição em USD', example: 1500.5 })
  valueUsd?: number;

  /** URL do logo do token */
  @ApiPropertyOptional({ description: 'URL do logo do token' })
  logoUrl?: string;
}

export class PortfolioResponseDto {
  /** Valor total do portfolio em USD */
  @ApiProperty({
    description: 'Valor total consolidado do portfolio em USD',
    example: 15230.75,
  })
  totalUsd: number;

  /** Chain do portfolio */
  @ApiProperty({
    description: 'Chain consultada',
    example: 'ethereum',
  })
  chain: string;

  /** Lista de tokens com balances */
  @ApiProperty({
    description: 'Lista de tokens com balances e valores em USD',
    type: [TokenBalanceDto],
  })
  tokens: TokenBalanceDto[];
}
