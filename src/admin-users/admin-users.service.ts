import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUser } from './entities/admin-user.entity';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { hashPassword } from '../common/utils/password';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) { }

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

  async create(createAdminUserDto: CreateAdminUserDto): Promise<AdminUserResponseDto> {
    const email = createAdminUserDto.email.toLowerCase();
    const existing = await this.adminRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email ja registrado');
    }

    const admin = this.adminRepo.create({
      name: createAdminUserDto.name,
      email,
      password: await hashPassword(createAdminUserDto.password),
      role: createAdminUserDto.role ?? 'admin',
      isActive: true,
    });

    const saved = await this.adminRepo.save(admin);
    return this.toResponse(saved);
  }

  async findAll(): Promise<AdminUserResponseDto[]> {
    const admins = await this.adminRepo.find({ order: { createdAt: 'DESC' } });
    return admins.map((admin) => this.toResponse(admin));
  }

  async findOne(id: string): Promise<AdminUserResponseDto> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin nao encontrado');
    }
    return this.toResponse(admin);
  }

  async update(id: string, updateAdminUserDto: UpdateAdminUserDto): Promise<AdminUserResponseDto> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin nao encontrado');
    }

    if (updateAdminUserDto.name) admin.name = updateAdminUserDto.name;
    if (updateAdminUserDto.email) admin.email = updateAdminUserDto.email.toLowerCase();
    if (updateAdminUserDto.role) admin.role = updateAdminUserDto.role;
    if (typeof updateAdminUserDto.isActive === 'boolean') admin.isActive = updateAdminUserDto.isActive;
    if (updateAdminUserDto.password) {
      admin.password = await hashPassword(updateAdminUserDto.password);
    }

    const saved = await this.adminRepo.save(admin);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.adminRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Admin nao encontrado');
    }
  }

  async createMock() {
    try {

      return null;

      const adminUser = {
        name: "rafael",
        email: "rafael@rafael.com",
        password: await hashPassword("12345678"),
        role: 'admin',
        isActive: true,
      }
      const saved = await this.adminRepo.save(adminUser);
      return this.toResponse(saved);
    } catch (err: any) {
      console.error(err.message);
    }
  }
}
