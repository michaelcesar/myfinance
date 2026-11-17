/**
 * Módulo de autenticação.
 *
 * @module modules/auth/auth.module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '~/modules/categories/categories.module';
import { LedgersModule } from '~/modules/ledgers/ledgers.module';
import { UsersModule } from '~/modules/users/users.module';
import { AuthController } from './auth.controller';
import { AuthCronService } from './auth.cron';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

/**
 * Cadastro, login e sessão. O `JwtModule` é global (registrado no
 * `AppModule`) porque o `AuthGuard` também é.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken]), UsersModule, LedgersModule, CategoriesModule],
  controllers: [AuthController],
  providers: [AuthService, AuthCronService],
})
export class AuthModule {}
