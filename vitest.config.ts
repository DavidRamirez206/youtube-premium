import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __YTAF_VERSION__: JSON.stringify('0.0.0-test')
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,ts}'],
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/**/*-polyfill.*', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'lcov']
    }
  }
});
