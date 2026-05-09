import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportsController } from './admin-reports.controller';
import { SwapOrder } from '../swap/entities/swap-order.entity';
import { SwapMatch } from '../swap/entities/swap-match.entity';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MetricsModule } from '../common/metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapOrder, SwapMatch]),
    AdminAuthModule,
    MetricsModule,
  ],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}
