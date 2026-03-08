import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '../../common/types/chain.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { SwapOrder } from './swap-order.entity';
import { EscrowTransaction } from './escrow-transaction.entity';

export interface FeeBreakdownJson {
  feePercentage: number;
  userAFeeAmount: string;
  userAFeeUsd: string;
  userBFeeAmount: string;
  userBFeeUsd: string;
  estimatedGasA: string;
  estimatedGasB: string;
}

@Entity('swap_matches')
export class SwapMatch {
  @ApiProperty({ description: 'ID único do match (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SwapOrder)
  @JoinColumn({ name: 'orderAId' })
  orderA: SwapOrder;

  @ApiProperty({ description: 'ID da ordem do usuário A' })
  @Column()
  orderAId: string;

  @ManyToOne(() => SwapOrder)
  @JoinColumn({ name: 'orderBId' })
  orderB: SwapOrder;

  @ApiProperty({ description: 'ID da ordem do usuário B (complementar)' })
  @Column()
  orderBId: string;

  @ApiProperty({ description: 'Chain onde o swap ocorre', enum: Chain })
  @Column({ type: 'enum', enum: Chain })
  chain: Chain;

  @ApiProperty({ description: 'Se o usuário A confirmou os termos', example: false })
  @Column({ type: 'boolean', default: false })
  userAConfirmed: boolean;

  @ApiProperty({ description: 'Se o usuário B confirmou os termos', example: false })
  @Column({ type: 'boolean', default: false })
  userBConfirmed: boolean;

  @ApiPropertyOptional({
    description: 'Detalhamento das taxas do swap',
    example: {
      feePercentage: 0.5,
      userAFeeAmount: '5.00',
      userAFeeUsd: '5.00',
      userBFeeAmount: '0.0025',
      userBFeeUsd: '5.00',
      estimatedGasA: '0.005',
      estimatedGasB: '0.005',
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  feeBreakdown: FeeBreakdownJson | null;

  @ApiProperty({
    description: 'Status do match',
    enum: OrderStatus,
    example: OrderStatus.MATCHED,
  })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.MATCHED })
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Data de expiração do match (se não confirmado)' })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Data de criação' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => EscrowTransaction, (tx) => tx.match)
  escrowTransactions: EscrowTransaction[];
}
