import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '../../common/types/chain.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { User } from '../../auth/entities/user.entity';

@Entity('swap_orders')
@Index(['offerToken', 'wantToken', 'chain', 'status'])
export class SwapOrder {
  @ApiProperty({ description: 'ID único da ordem (UUID)', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'ID do usuário que criou a ordem' })
  @Column()
  userId: string;

  @ApiProperty({ description: 'Chain onde o swap ocorre', enum: Chain, example: Chain.ETHEREUM })
  @Column({ type: 'enum', enum: Chain })
  chain: Chain;

  @ApiProperty({
    description: 'Contract address do token oferecido (ou "NATIVE" para ETH/SOL)',
    example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  })
  @Column()
  offerToken: string;

  @ApiProperty({ description: 'Símbolo do token oferecido', example: 'USDC' })
  @Column()
  offerTokenSymbol: string;

  @ApiProperty({
    description: 'Quantidade oferecida (em unidades do token, não wei)',
    example: '1000.00',
  })
  @Column({ type: 'decimal', precision: 36, scale: 18 })
  offerAmount: string;

  @ApiProperty({
    description: 'Contract address do token desejado',
    example: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  })
  @Column()
  wantToken: string;

  @ApiProperty({ description: 'Símbolo do token desejado', example: 'ETH' })
  @Column()
  wantTokenSymbol: string;

  @ApiProperty({ description: 'Quantidade desejada', example: '0.50' })
  @Column({ type: 'decimal', precision: 36, scale: 18 })
  wantAmount: string;

  @ApiProperty({
    description: 'Status atual da ordem',
    enum: OrderStatus,
    example: OrderStatus.OPEN,
  })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.OPEN })
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Valor da oferta em USD no momento da criação', example: '1000.00' })
  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  offerAmountUsd: string | null;

  @ApiPropertyOptional({ description: 'Valor desejado em USD no momento da criação', example: '995.00' })
  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  wantAmountUsd: string | null;

  @ApiPropertyOptional({ description: 'Data de expiração da ordem' })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Data de criação' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @UpdateDateColumn()
  updatedAt: Date;
}
