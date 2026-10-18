import { defineConfig } from 'vitest/config';

/** Integration tests: need DynamoDB Local on DDB_ENDPOINT (docker compose, or the CI service). */
export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.int.test.ts'],
    environment: 'node',
    fileParallelism: false,
  },
});
