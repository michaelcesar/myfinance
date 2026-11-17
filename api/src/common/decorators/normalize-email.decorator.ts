/**
 * Normaliza e-mail recebido em DTO.
 *
 * @module common/decorators/normalize-email.decorator
 */
import { Transform } from 'class-transformer';

/**
 * Apara espaços e passa para minúsculas antes da validação. Todo campo de
 * e-mail digitado pelo usuário usa este decorator: o TypeORM não aplica
 * transformação de coluna em `where`, e a busca por duplicidade erraria.
 *
 * @example
 * @NormalizeEmail()
 * @IsEmail()
 * email: string;
 */
export const NormalizeEmail = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
