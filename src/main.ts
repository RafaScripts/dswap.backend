import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ─── Security ──────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  }

  // ─── CORS ──────────────────────────────────────────────
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://dswap.app']
      : true,
    credentials: true,
  });

  // ─── Global Validation Pipe ────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger Setup ─────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DSwap API')
    .setDescription(
      '## API do DSwap — Decentralized Token Swap Platform\n\n' +
      'Backend para o DSwap, uma plataforma de swap P2P de tokens.\n\n' +
      '### Módulos\n' +
      '- **Auth**: Autenticação via assinatura de wallet (SIWE/SIWS)\n' +
      '- **Market**: Proxy de dados de mercado (CoinMarketCap)\n' +
      '- **Portfolio**: Agregação de balances on-chain\n' +
      '- **Swap**: Matching engine, escrow, e troca P2P\n' +
      '- **Notifications**: Push notifications via Expo\n\n' +
      '### Autenticação\n' +
      'Use `POST /auth/nonce` para obter uma mensagem para assinar, ' +
      '`POST /auth/verify` para verificar a assinatura e receber um JWT. ' +
      'Inclua o JWT no header `Authorization: Bearer <token>` para rotas protegidas.\n\n' +
      '### WebSocket\n' +
      'Conecte-se ao namespace `/swap` com `{ auth: { token: JWT } }` para ' +
      'receber notificações em tempo real de matches, depósitos, e status de swap.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT obtido via POST /auth/verify',
    })
    .addTag('Auth', 'Autenticação via assinatura de wallet (SIWE para EVM, SIWS para Solana)')
    .addTag('Market', 'Proxy CoinMarketCap com cache Redis — preços, trending, metadados')
    .addTag('Portfolio', 'Agregação de balances on-chain (EVM + Solana) com preços em USD')
    .addTag('Swap', 'Core: ordens de swap, matching engine, escrow, WebSocket real-time')
    .addTag('Notifications', 'Registro de push tokens e notificações via Expo Push API')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // --- Swagger save JSON file --------------------
  if (process.env.NODE_ENV === 'development') {
    writeFileSync('./swagger.json', JSON.stringify(document));
  }

  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  // ─── Start ─────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 DSwap API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
}

bootstrap();
