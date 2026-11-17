/**
 * DTO de troca de senha.
 *
 * @module modules/auth/dto/change-password.dto
 */
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Senha atual e a nova. */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Informe a senha atual.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha precisa ter pelo menos 8 caracteres.' })
  @MaxLength(128)
  newPassword: string;
}
