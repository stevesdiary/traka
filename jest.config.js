export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }],
    '^.+\\.js$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // pnpm nests real packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>/...
  // so the lookahead must tolerate an optional `.pnpm/` segment before the package name.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/)?(nanoid|otplib|@otplib[+/]|@scure[+/]|@noble[+/]))',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};