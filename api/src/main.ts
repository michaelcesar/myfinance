/**
 * Ponto de entrada da API.
 *
 * @module main
 */
import { config as loadEnv } from 'dotenv';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

loadEnv({ quiet: true });

const logger = new Logger('Main');

/**
 * Rede de segurança do processo: uma promise solta é registrada com stack
 * em vez de derrubar a API inteira.
 */
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error(`Unhandled rejection: ${error.message}`, error.stack);
});

/**
 * Sobe o Nest com segurança de cabeçalhos, cookies, CORS para o front,
 * pipes/filtros/interceptors globais e Swagger fora de produção.
 *
 * @example
 * pnpm run start:dev
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: process.env.FRONTEND_DOMAIN, credentials: true },
  });
  app.use(helmet());
  app.use(cookieParser());
  configureApp(app);

  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Finance Manager API').setVersion('1.0').addBearerAuth().build());
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  logger.log(`Finance Manager API ouvindo na porta ${port}`);
}

void bootstrap();
