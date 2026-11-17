/**
 * DTO de atualização do perfil.
 *
 * @module modules/users/dto/update-profile.dto
 */
import { IsString, Length } from 'class-validator';

/** Dados editáveis do próprio perfil. */
export class UpdateProfileDto {
  @IsString()
  @Length(2, 120, { message: 'O nome precisa ter entre 2 e 120 caracteres.' })
  name: string;
}
