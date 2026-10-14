// Unit and integration tests (ADR-0006): Node environment, pure logic. Naming: adapters/tests.md.
// getViteConfig lets component tests render .astro files with Astro's container API.
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
