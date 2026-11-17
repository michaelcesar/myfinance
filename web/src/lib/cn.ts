/**
 * Junção condicional de classes CSS.
 *
 * @module lib/cn
 */
import { clsx, type ClassValue } from 'clsx';

/**
 * Junta classes, ignorando valores falsos.
 *
 * @param inputs - Classes, objetos condicionais ou listas
 * @returns String de classes
 *
 * @example
 * cn('px-4', isActive && 'bg-primary'); // 'px-4 bg-primary'
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
