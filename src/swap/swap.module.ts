import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwapController } from './swap.controller';
import { SwapService } from './swap.service';
import { MatchingEngineService } from './matching-engine.service';
import { FeeCalculatorService } from './fee-calculator.service';
import { EscrowService } from './escrow.service';
import { SwapGateway } from './swap.gateway';
import { SwapOrder } from './entities/swap-order.entity';
import { SwapMatch } from './entities/swap-match.entity';
import { EscrowTransaction } from './entities/escrow-transaction.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapOrder, SwapMatch, EscrowTransaction]),
    forwardRef(() => AuthModule),
  ],
  controllers: [SwapController],
  providers: [
    SwapService,
    MatchingEngineService,
    FeeCalculatorService,
    EscrowService,
    SwapGateway,
  ],
  exports: [SwapService, SwapGateway],
})
export class SwapModule {}
