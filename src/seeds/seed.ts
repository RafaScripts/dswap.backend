import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../auth/entities/user.entity';
import { SwapOrder } from '../swap/entities/swap-order.entity';
import { SwapMatch } from '../swap/entities/swap-match.entity';
import { EscrowTransaction } from '../swap/entities/escrow-transaction.entity';
import { Chain } from '../common/types/chain.enum';
import { OrderStatus } from '../swap/enums/order-status.enum';

dotenv.config();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: process.env.DATABASE_NAME ?? 'dswap',
    entities: [User, SwapOrder, SwapMatch, EscrowTransaction],
    synchronize: true, // cria tabelas automaticamente no seed
  });

  await dataSource.initialize();
  console.log('📦 Database conectado');

  const userRepo = dataSource.getRepository(User);
  const orderRepo = dataSource.getRepository(SwapOrder);

  // ─── Seed Users ───────────────────────────────────────
  const usersData = [
    {
      address: '0x1111111111111111111111111111111111111111',
      primaryChain: Chain.ETHEREUM,
    },
    {
      address: '0x2222222222222222222222222222222222222222',
      primaryChain: Chain.ETHEREUM,
    },
    {
      address: '0x3333333333333333333333333333333333333333',
      primaryChain: Chain.POLYGON,
    },
    {
      address: 'So1anaFakeAddress1111111111111111111111111',
      primaryChain: Chain.SOLANA,
    },
  ];

  const users: User[] = [];
  for (const data of usersData) {
    let user = await userRepo.findOne({ where: { address: data.address } });
    if (!user) {
      user = userRepo.create(data);
      user = await userRepo.save(user);
      console.log(`✅ User criado: ${user.address} (${user.primaryChain})`);
    } else {
      console.log(`⏭️  User já existe: ${user.address}`);
    }
    users.push(user);
  }

  // ─── Seed Swap Orders ─────────────────────────────────
  const ordersData = [
    {
      userId: users[0].id,
      chain: Chain.ETHEREUM,
      offerToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      offerTokenSymbol: 'USDC',
      offerAmount: '1000.00',
      wantToken: 'NATIVE',
      wantTokenSymbol: 'ETH',
      wantAmount: '0.50',
      status: OrderStatus.OPEN,
      offerAmountUsd: '1000.00',
      wantAmountUsd: '995.00',
      expiresAt: new Date(Date.now() + 60 * 60_000), // 1 hora
    },
    {
      userId: users[1].id,
      chain: Chain.ETHEREUM,
      offerToken: 'NATIVE',
      offerTokenSymbol: 'ETH',
      offerAmount: '0.50',
      wantToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      wantTokenSymbol: 'USDC',
      wantAmount: '1000.00',
      status: OrderStatus.OPEN,
      offerAmountUsd: '995.00',
      wantAmountUsd: '1000.00',
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
    {
      userId: users[2].id,
      chain: Chain.POLYGON,
      offerToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      offerTokenSymbol: 'USDC',
      offerAmount: '500.00',
      wantToken: 'NATIVE',
      wantTokenSymbol: 'POL',
      wantAmount: '1200.00',
      status: OrderStatus.OPEN,
      offerAmountUsd: '500.00',
      wantAmountUsd: '500.00',
      expiresAt: new Date(Date.now() + 120 * 60_000),
    },
  ];

  for (const data of ordersData) {
    const existing = await orderRepo.findOne({
      where: { userId: data.userId, offerToken: data.offerToken, wantToken: data.wantToken },
    });
    if (!existing) {
      const order = orderRepo.create(data);
      await orderRepo.save(order);
      console.log(`✅ Order criada: ${data.offerAmount} ${data.offerTokenSymbol} → ${data.wantAmount} ${data.wantTokenSymbol} (${data.chain})`);
    } else {
      console.log(`⏭️  Order já existe: ${data.offerTokenSymbol} → ${data.wantTokenSymbol}`);
    }
  }

  console.log('\n🌱 Seed concluído!');
  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Seed falhou:', error);
  process.exit(1);
});
