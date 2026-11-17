/**
 * Configuração do Jest para os testes unitários e guardas executáveis.
 *
 * @module test/jest.config
 */
import { type Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.dto.ts', '!src/**/*.entity.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
};

export default config;
