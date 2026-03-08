import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { EvmBalanceProvider } from './providers/evm-balance.provider';
import { SolanaBalanceProvider } from './providers/solana-balance.provider';

@Module({
  controllers: [PortfolioController],
  providers: [PortfolioService, EvmBalanceProvider, SolanaBalanceProvider],
  exports: [PortfolioService],
})
export class PortfolioModule {}
