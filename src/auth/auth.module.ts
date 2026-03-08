import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SiweStrategy } from './strategies/siwe.strategy';
import { SiwsStrategy } from './strategies/siws.strategy';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-me-in-production'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION', '7d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SiweStrategy, SiwsStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
