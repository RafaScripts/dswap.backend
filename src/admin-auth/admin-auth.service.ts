import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AdminUser } from '../admin-users/entities/admin-user.entity';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/admin-login.dto';
import { verifyPassword } from '../common/utils/password';
import { AdminUserResponseDto } from '../admin-users/dto/admin-user-response.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  private toResponse(admin: AdminUser): AdminUserResponseDto {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  async login(dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const email = dto.email.toLowerCase();

    const admin = await this.adminRepo
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.email = :email', { email })
      .getOne();

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const validPassword = await verifyPassword(dto.password, admin.password);
    if (!validPassword) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      admin: this.toResponse(admin),
    };
  }
}
