import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminUser } from '../admin-users/entities/admin-user.entity';
import { AdminAuthGuard } from '../common/guards';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser])],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminAuthModule {}
