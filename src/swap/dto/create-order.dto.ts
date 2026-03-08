import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Chain } from '../../common/types/chain.enum';

export class CreateOrderDto {
  /** Chain onde o swap deve ocorrer */
  @ApiProperty({
    description: 'Chain onde o swap deve ocorrer. Ambos os tokens devem estar nesta chain.',
    enum: Chain,
    example: Chain.ETHEREUM,
  })
  @IsEnum(Chain)
  chain: Chain;

  /** Contract address do token que o usuário tem e quer trocar */
  @ApiProperty({
    description: 'Contract address do token oferecido (use "NATIVE" para token nativo da chain, ex: ETH, SOL)',
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  })
  @IsString()
  @IsNotEmpty()
  offerToken: string;

  /** Símbolo do token oferecido (UI-only, para facilitar leitura) */
  @ApiProperty({
    description: 'Símbolo do token oferecido (para exibição)',
    example: 'USDC',
  })
  @IsString()
  @IsNotEmpty()
  offerTokenSymbol: string;

  /** Quantidade que o usuário oferece */
  @ApiProperty({
    description: 'Quantidade oferecida em unidades do token (não em wei/lamports)',
    example: '1000.00',
  })
  @IsString()
  @IsNotEmpty()
  offerAmount: string;

  /** Contract address do token que o usuário deseja receber */
  @ApiProperty({
    description: 'Contract address do token desejado (use "NATIVE" para token nativo)',
    example: 'NATIVE',
  })
  @IsString()
  @IsNotEmpty()
  wantToken: string;

  /** Símbolo do token desejado */
  @ApiProperty({
    description: 'Símbolo do token desejado (para exibição)',
    example: 'ETH',
  })
  @IsString()
  @IsNotEmpty()
  wantTokenSymbol: string;

  /** Quantidade desejada em troca */
  @ApiProperty({
    description: 'Quantidade desejada em unidades do token',
    example: '0.50',
  })
  @IsString()
  @IsNotEmpty()
  wantAmount: string;

  /** Tempo de expiração em minutos (opcional, padrão: 60) */
  @ApiPropertyOptional({
    description: 'Tempo de expiração da ordem em minutos (padrão: 60)',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  expirationMinutes?: number;
}
