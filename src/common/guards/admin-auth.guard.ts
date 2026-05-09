import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../../admin-users/entities/admin-user.entity';

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
