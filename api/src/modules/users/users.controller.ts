/**
 * Rotas do perfil do usuário.
 *
 * @module modules/users/users.controller
 */
import { Body, Controller, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { type User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * Edição do próprio perfil. A leitura fica em `GET /auth/me`.
 *
 * @example
 * PATCH /users/me { "name": "Ana Souza" }
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Atualiza o nome do usuário logado.
   *
   * @param user - Usuário autenticado
   * @param dto - Novo nome
   * @returns Usuário atualizado
   *
   * @example
   * PATCH /users/me { "name": "Ana Souza" }
   */
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<User> {
    return this.usersService.updateProfile(user.userId, dto);
  }
}
