import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    testMatch: ['**/tests/unit/*.test.ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    clearMocks: true,
    testEnvironment: 'node',
};

export default config;
