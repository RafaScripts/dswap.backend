import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Registra o push token do dispositivo para receber notificações.
   * Deve ser chamado após login e sempre que o token for atualizado pelo Expo.
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar push token',
    description:
      'Registra o Expo Push Token do dispositivo para o usuário autenticado. ' +
      'Isso permite que o backend envie notificações push para o dispositivo ' +
      '(match encontrado, depósito confirmado, swap concluído, etc). ' +
      'Deve ser chamado após login e sempre que o token Expo mudar.',
  })
  @ApiBody({ type: RegisterPushTokenDto })
  @ApiResponse({ status: 200, description: 'Push token registrado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async registerPushToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    return this.notificationsService.registerPushToken(user.sub, dto.pushToken);
  }
}
