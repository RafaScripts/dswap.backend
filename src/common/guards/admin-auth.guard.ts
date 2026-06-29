import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { AdminUser } from '../../admin-users/entities/admin-user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface AdminJwtPayload {
  sub?: string;
  type?: string;
  admin?: boolean;
  role?: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const payload = request.user as AdminJwtPayload | undefined;

    if (!payload?.sub || (payload.type !== 'admin' && payload.admin !== true)) {
      throw new ForbiddenException('Acesso restrito a admins');
    }

    const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
    const role = admin?.role?.toLowerCase();
    if (!admin || !admin.isActive || role !== 'admin') {
      throw new ForbiddenException('Admin inativo ou nao encontrado');
    }

    request.admin = admin;
    return true;
  }
}
