import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Registra o Expo push token para um usuário.
   */
  async registerPushToken(userId: string, pushToken: string): Promise<void> {
    await this.userRepo.update(userId, { pushToken });
    this.logger.log(`Push token registrado para user ${userId}`);
  }

  /**
   * Envia push notification via Expo Push API.
   *
   * @param pushToken - Expo push token do destinatário
   * @param title - Título da notificação
   * @param body - Corpo da notificação
   * @param data - Dados extras (deep linking, payload)
   */
  async send(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: pushToken,
          title,
          body,
          data,
          sound: 'default',
        }),
      });

      if (!response.ok) {
        this.logger.error(`Falha ao enviar push: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error('Erro ao enviar push notification', error);
    }
  }

  /**
   * Envia notificação para um usuário pelo ID.
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.pushToken) {
      await this.send(user.pushToken, title, body, data);
    }
  }
}
