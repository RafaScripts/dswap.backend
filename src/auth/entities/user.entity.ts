import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chain } from '../../common/types/chain.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty({ description: 'ID único do usuário (UUID)', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Endereço da wallet (EVM hex ou Solana base58)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @Column({ unique: true })
  address: string;

  @ApiProperty({
    description: 'Chain principal usada no login',
    enum: Chain,
    example: Chain.ETHEREUM,
  })
  @Column({ type: 'enum', enum: Chain })
  primaryChain: Chain;

  @ApiPropertyOptional({ description: 'Nonce rotativo para autenticação SIWE/SIWS' })
  @Column({ type: 'varchar', nullable: true })
  nonce: string | null;

  @ApiPropertyOptional({ description: 'Expo push token para notificações' })
  @Column({ type: 'varchar', nullable: true })
  pushToken: string | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relação definida no SwapOrder (import circular evitado via lazy)
  @OneToMany('SwapOrder', 'user')
  orders: unknown[];
}
