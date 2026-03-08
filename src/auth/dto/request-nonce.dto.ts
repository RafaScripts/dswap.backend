import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Chain } from '../../common/types/chain.enum';

export class RequestNonceDto {
  /** Endereço da wallet do usuário (EVM hex ou Solana base58) */
  @ApiProperty({
    description: 'Endereço da wallet do usuário (EVM hex ou Solana base58)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  /** Chain da wallet */
  @ApiProperty({
    description: 'Chain da wallet usada para autenticação',
    enum: Chain,
    example: Chain.ETHEREUM,
  })
  @IsEnum(Chain)
  chain: Chain;
}

export class NonceResponseDto {
  /** Nonce gerado para assinatura */
  @ApiProperty({
    description: 'Nonce aleatório que deve ser incluído na mensagem a ser assinada',
    example: 'a1b2c3d4e5f6',
  })
  nonce: string;

  /** Mensagem formatada pronta para assinatura */
  @ApiProperty({
    description: 'Mensagem formatada (SIWE para EVM ou SIWS para Solana) pronta para ser assinada pela wallet',
    example: 'dswap.app wants you to sign in with your Ethereum account:\n0x1234...',
  })
  message: string;
}
