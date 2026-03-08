import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Chain } from '../../common/types/chain.enum';
import { User } from '../entities/user.entity';

export class VerifySignatureDto {
  /** Mensagem SIWE/SIWS que o usuário assinou */
  @ApiProperty({
    description: 'Mensagem completa (SIWE ou SIWS) que foi assinada pela wallet',
    example: 'dswap.app wants you to sign in with your Ethereum account:\n0x1234...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  /** Assinatura produzida pela wallet */
  @ApiProperty({
    description: 'Assinatura hex (EVM) ou base64 (Solana) produzida pela wallet',
    example: '0xabcdef...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  /** Chain usada na assinatura */
  @ApiProperty({
    description: 'Chain da wallet que gerou a assinatura',
    enum: Chain,
    example: Chain.ETHEREUM,
  })
  @IsEnum(Chain)
  chain: Chain;

  /**
   * Endereço da wallet (obrigatório para Solana, opcional para EVM pois é extraído da mensagem SIWE).
   */
  @ApiProperty({
    description: 'Endereço da wallet (obrigatório para Solana)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;
}

export class VerifyResponseDto {
  /** JWT access token */
  @ApiProperty({
    description: 'JWT access token para autenticação nas rotas protegidas',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  /** Dados do usuário */
  @ApiProperty({
    description: 'Dados do usuário autenticado',
    type: () => User,
  })
  user: User;
}
