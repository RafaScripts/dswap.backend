import { ApiProperty } from '@nestjs/swagger';

export class FeeBreakdownDto {
  /** Percentual da taxa */
  @ApiProperty({ description: 'Percentual da taxa de swap', example: 0.5 })
  feePercentage: number;

  /** Taxa aplicada ao User A em unidades do token ofertado */
  @ApiProperty({ description: 'Fee em unidades do token do User A', example: '5.00' })
  userAFeeAmount: string;

  /** Taxa do User A em USD */
  @ApiProperty({ description: 'Fee do User A em USD', example: '5.00' })
  userAFeeUsd: string;

  /** Taxa aplicada ao User B em unidades do token ofertado */
  @ApiProperty({ description: 'Fee em unidades do token do User B', example: '0.0025' })
  userBFeeAmount: string;

  /** Taxa do User B em USD */
  @ApiProperty({ description: 'Fee do User B em USD', example: '5.00' })
  userBFeeUsd: string;

  /** Gas estimado para depósito do User A */
  @ApiProperty({ description: 'Gas estimado para transação do User A', example: '0.005' })
  estimatedGasA: string;

  /** Gas estimado para depósito do User B */
  @ApiProperty({ description: 'Gas estimado para transação do User B', example: '0.005' })
  estimatedGasB: string;
}
