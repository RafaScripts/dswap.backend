import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '../../common/types/chain.enum';
import { EscrowStatus } from '../enums/escrow-status.enum';
import { TransactionDirection } from '../enums/transaction-direction.enum';
import { SwapMatch } from './swap-match.entity';

@Entity('escrow_transactions')
export class EscrowTransaction {
  @ApiProperty({ description: 'ID único da transação de escrow (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SwapMatch, (match) => match.escrowTransactions)
  @JoinColumn({ name: 'matchId' })
  match: SwapMatch;

  @ApiProperty({ description: 'ID do match associado' })
  @Column()
  matchId: string;

  @ApiProperty({ description: 'Endereço de origem (wallet do usuário para INBOUND)' })
  @Column()
  fromAddress: string;

  @ApiProperty({ description: 'Endereço de destino (hot wallet para INBOUND, user para OUTBOUND)' })
  @Column()
  toAddress: string;

  @ApiProperty({ description: 'Contract address do token' })
  @Column()
  token: string;

  @ApiProperty({ description: 'Símbolo do token', example: 'USDC' })
  @Column()
  tokenSymbol: string;

  @ApiProperty({ description: 'Quantidade em unidades do token', example: '1000.00' })
  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @ApiProperty({ description: 'Chain da transação', enum: Chain })
  @Column({ type: 'enum', enum: Chain })
  chain: Chain;

  @ApiProperty({ description: 'Status do escrow', enum: EscrowStatus, example: EscrowStatus.AWAITING_DEPOSIT })
  @Column({ type: 'enum', enum: EscrowStatus, default: EscrowStatus.AWAITING_DEPOSIT })
  status: EscrowStatus;

  @ApiProperty({
    description: 'Direção: INBOUND (user → escrow) ou OUTBOUND (escrow → user)',
    enum: TransactionDirection,
  })
  @Column({ type: 'enum', enum: TransactionDirection })
  direction: TransactionDirection;

  @ApiPropertyOptional({ description: 'Hash da transação on-chain' })
  @Column({ type: 'varchar', nullable: true })
  txHash: string | null;

  @ApiPropertyOptional({ description: 'Número do bloco da confirmação' })
  @Column({ type: 'int', nullable: true })
  blockNumber: number | null;

  @ApiProperty({ description: 'Quantidade de confirmações da transação', example: 0 })
  @Column({ type: 'int', default: 0 })
  confirmations: number;

  @ApiProperty({ description: 'Data de criação' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @UpdateDateColumn()
  updatedAt: Date;
}
