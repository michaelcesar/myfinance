/**
 * Serviço de usuários.
 *
 * @module modules/users/users.service
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { type UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';

/**
 * Leitura e escrita de usuários. A senha só é lida em `findByEmailWithHash`,
 * usado pelo login; as demais consultas nunca carregam o hash.
 *
 * @example
 * const user = await usersService.findById(userId);
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  /**
   * Conta os usuários cadastrados.
   *
   * @returns Total de usuários
   *
   * @example
   * const isFirstUser = (await usersService.count()) === 0;
   */
  count(): Promise<number> {
    return this.repo.count();
  }

  /**
   * Busca um usuário pelo e-mail já normalizado, com o hash da senha.
   *
   * @param email - E-mail em minúsculas
   * @returns Usuário com `passwordHash`, ou `null`
   *
   * @example
   * const user = await usersService.findByEmailWithHash('ana@exemplo.com');
   */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.repo.createQueryBuilder('user').addSelect('user.passwordHash').where('user.email = :email', { email }).getOne();
  }

  /**
   * Busca um usuário pelo id com o hash da senha (troca de senha).
   *
   * @param userId - Id do usuário
   * @returns Usuário com `passwordHash`
   * @throws `NotFoundException` se não existir
   *
   * @example
   * const user = await usersService.findByIdWithHash(userId);
   */
  async findByIdWithHash(userId: string): Promise<User> {
    const user = await this.repo.createQueryBuilder('user').addSelect('user.passwordHash').where('user.userId = :userId', { userId }).getOne();
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  /**
   * Busca um usuário pelo id.
   *
   * @param userId - Id do usuário
   * @returns Usuário sem o hash
   * @throws `NotFoundException` se não existir
   *
   * @example
   * const me = await usersService.findById(user.userId);
   */
  async findById(userId: string): Promise<User> {
    const user = await this.repo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  /**
   * Cria um usuário dentro de uma transação em andamento.
   *
   * @param manager - Gerenciador da transação
   * @param data - Nome, e-mail normalizado e hash da senha
   * @returns Usuário criado
   *
   * @example
   * await dataSource.transaction(manager => usersService.create(manager, { name, email, passwordHash }));
   */
  async create(manager: EntityManager, data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User> {
    const repo = manager.getRepository(User);
    const user = await repo.save(repo.create(data));
    this.logger.log(`Usuário criado: ${user.userId}`);
    return user;
  }

  /**
   * Atualiza o nome do usuário.
   *
   * @param userId - Id do usuário
   * @param dto - Novo nome
   * @returns Usuário atualizado
   *
   * @example
   * await usersService.updateProfile(userId, { name: 'Ana Souza' });
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    user.name = dto.name.trim();
    return this.repo.save(user);
  }

  /**
   * Grava um novo hash de senha.
   *
   * @param userId - Id do usuário
   * @param passwordHash - Hash bcrypt da nova senha
   *
   * @example
   * await usersService.updatePasswordHash(userId, await hash(nova, 12));
   */
  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.repo.update({ userId }, { passwordHash });
  }
}
