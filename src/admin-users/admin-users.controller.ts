import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { AdminAuthGuard } from '../common/guards';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin-users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar admin' })
  @ApiResponse({ status: 201, description: 'Admin criado', type: AdminUserResponseDto })
  create(@Body() createAdminUserDto: CreateAdminUserDto): Promise<AdminUserResponseDto> {
    return this.adminUsersService.create(createAdminUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar admins' })
  @ApiResponse({ status: 200, description: 'Lista de admins', type: [AdminUserResponseDto] })
  findAll(): Promise<AdminUserResponseDto[]> {
    return this.adminUsersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar admin por ID' })
  @ApiResponse({ status: 200, description: 'Admin encontrado', type: AdminUserResponseDto })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminUserResponseDto> {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar admin' })
  @ApiResponse({ status: 200, description: 'Admin atualizado', type: AdminUserResponseDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateAdminUserDto: UpdateAdminUserDto,
  ): Promise<AdminUserResponseDto> {
    return this.adminUsersService.update(id, updateAdminUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover admin' })
  @ApiResponse({ status: 200, description: 'Admin removido' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.adminUsersService.remove(id);
  }
}
