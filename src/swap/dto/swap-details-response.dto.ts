import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SwapOrder } from '../entities/swap-order.entity';
import { FeeBreakdownDto } from './fee-breakdown.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { EscrowTransaction } from '../entities/escrow-transaction.entity';

export class SwapDetailsResponseDto {
  /** ID do match */
  @ApiProperty({ description: 'ID do match', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  matchId: string;

  /** Ordem do usuário A */
  @ApiProperty({ description: 'Ordem do usuário A', type: () => SwapOrder })
  orderA: SwapOrder;

  /** Ordem do usuário B (counterparty) */
  @ApiProperty({ description: 'Ordem do usuário B (counterparty)', type: () => SwapOrder })
  orderB: SwapOrder;

  /** Detalhamento das taxas */
  @ApiPropertyOptional({ description: 'Detalhamento das taxas', type: FeeBreakdownDto })
  feeBreakdown?: FeeBreakdownDto;

  /** Status atual */
  @ApiProperty({ description: 'Status do match', enum: OrderStatus })
  status: OrderStatus;

  /** Se o usuário A confirmou */
  @ApiProperty({ description: 'User A confirmou?', example: false })
  userAConfirmed: boolean;

  /** Se o usuário B confirmou */
  @ApiProperty({ description: 'User B confirmou?', example: false })
  userBConfirmed: boolean;

  /** Transações de escrow associadas */
  @ApiPropertyOptional({
    description: 'Transações de escrow (depósitos e distribuições)',
    type: () => [EscrowTransaction],
  })
  escrowTransactions?: EscrowTransaction[];

  /** Data de expiração */
  @ApiPropertyOptional({ description: 'Data de expiração do match' })
  expiresAt?: Date;
}
