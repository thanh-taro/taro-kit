// Unit and integration tests (ADR-0006): Node environment, pure logic. Naming: adapters/tests.md.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
