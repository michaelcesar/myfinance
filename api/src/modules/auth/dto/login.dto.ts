/**
 * DTO de login.
 *
 * @module modules/auth/dto/login.dto
 */
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '~/common/decorators';

/** Credenciais de acesso. */
export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  @MaxLength(128)
  password: string;
}
