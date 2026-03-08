import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterPushTokenDto {
  /** Expo push token para notificações */
  @ApiProperty({
    description: 'Token de push notification gerado pelo Expo (formato: ExponentPushToken[xxx])',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  pushToken: string;
}
