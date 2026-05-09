import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Config files
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import blockchainConfig from './config/blockchain.config';
import coinmarketcapConfig from './config/coinmarketcap.config';

// Entities
import { User } from './auth/entities/user.entity';
import { SwapOrder } from './swap/entities/swap-order.entity';
import { SwapMatch } from './swap/entities/swap-match.entity';
import { EscrowTransaction } from './swap/entities/escrow-transaction.entity';
import { AdminUser } from './admin-users/entities/admin-user.entity';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { MarketModule } from './market/market.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { SwapModule } from './swap/swap.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminReportsModule } from './admin-reports/admin-reports.module';

// Common
import { WalletAuthGuard } from './common/guards/wallet-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { RequestMetricsMiddleware } from './common/metrics/request-metrics.middleware';

@Module({
  imports: [
    // ─── Config ───────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, jwtConfig, blockchainConfig, coinmarketcapConfig],
    }),

    // ─── Database (TypeORM + PostgreSQL) ──────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: config.get<string>('DATABASE_NAME', 'dswap'),
        entities: [User, SwapOrder, SwapMatch, EscrowTransaction, AdminUser],
        synchronize: config.get<string>('NODE_ENV') === 'development',
        migrations: ['dist/migrations/*.js'],
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // ─── Cache (Redis) ────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get<string>('REDIS_PASSWORD') || undefined,
      }),
    }),

    // ─── Queue (BullMQ + Redis) ───────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // ─── Rate Limiting ────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // ─── Feature Modules ──────────────────────────────────
    AuthModule,
    MarketModule,
    PortfolioModule,
    SwapModule,
    NotificationsModule,
    AdminUsersModule,
    AdminAuthModule,
    AdminReportsModule,
    MetricsModule,
  ],
  providers: [
    // Guard global de autenticação (respects @Public())
    { provide: APP_GUARD, useClass: WalletAuthGuard },
    // Guard global de rate limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Interceptor global para envelope de resposta
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Filtro global de exceções
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    RequestMetricsMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestMetricsMiddleware).forRoutes('*');
  }
}
