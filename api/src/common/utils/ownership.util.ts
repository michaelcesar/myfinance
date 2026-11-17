/**
 * Busca de registro restrita ao dono.
 *
 * @module common/utils/ownership.util
 */
import { NotFoundException } from '@nestjs/common';
import { type FindOptionsRelations, type FindOptionsWhere, type ObjectLiteral, type Repository } from 'typeorm';

/**
 * Carrega um registro que precisa pertencer ao usuário.
 *
 * Registro de outro usuário responde 404, igual a um inexistente: 403
 * confirmaria que o id existe (`CONSTRAINTS.md` C06).
 *
 * @param repo - Repositório da entidade
 * @param where - Filtro, que deve incluir `userId`
 * @param message - Mensagem do 404
 * @param relations - Relações a carregar junto
 * @returns Registro encontrado
 * @throws `NotFoundException` se não existir ou for de outro usuário
 *
 * @example
 * const account = await findOwnedOrFail(this.repo, { accountId, userId }, 'Conta não encontrada.');
 */
export async function findOwnedOrFail<T extends ObjectLiteral>(repo: Repository<T>, where: FindOptionsWhere<T> & { userId: string }, message: string, relations?: FindOptionsRelations<T>): Promise<T> {
  const entity = await repo.findOne({ where, relations });
  if (!entity) throw new NotFoundException(message);
  return entity;
}
