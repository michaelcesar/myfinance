/**
 * Configuração global compartilhada entre `main.ts` e os testes e2e.
 *
 * @module bootstrap
 */
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from '~/common/filters/http-exception.filter';
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor';

/** Tamanho máximo do corpo JSON — cabe o backup de anos de lançamentos (`POST /backup/import`). */
const JSON_BODY_LIMIT = '25mb';

/**
 * Aplica o limite do corpo JSON, o `ValidationPipe` (`whitelist` + `transform`), o filtro de erro e
 * o envelope de sucesso. Os e2e chamam esta mesma função, então testam a
 * aplicação com o contrato real.
 *
 * @param app - Aplicação Nest criada
 * @returns A mesma aplicação, para encadear
 *
 * @example
 * configureApp(await NestFactory.create(AppModule));
 */
export function configureApp(app: INestApplication): INestApplication {
  (app as NestExpressApplication).useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  return app;
}
