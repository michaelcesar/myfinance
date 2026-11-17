/**
 * DTO de cadastro.
 *
 * @module modules/auth/dto/register.dto
 */
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '~/common/decorators';

/** Dados do novo usuário. */
export class RegisterDto {
  @IsString()
  @Length(2, 120, { message: 'O nome precisa ter entre 2 e 120 caracteres.' })
  name: string;

  @NormalizeEmail()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  @MaxLength(128)
  password: string;
}
