import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'local/.data/**',
      '**/cdk.out/**',
      'packages/vault/preview/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='console']",
          message: 'Use the structured logger in @dadjokes/core/log instead of console.*',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      // `const { ver: _ver, ...rest } = x` drops a field on purpose.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['packages/core/src/log.ts', 'scripts/**/*.ts', 'local/dev-server.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@aws-sdk/*'], message: 'core must stay free of AWS SDK imports' },
            { group: ['node:fs', 'node:http'], message: 'core must stay free of I/O' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/core/src/http/node.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Type-aware linting (H-7): every writer must await its writes rather than
    // leaving a promise floating. Each package, and scripts/ and local/, has
    // its own tsconfig.json, so the project service's directory walk (which
    // looks for that exact file name) finds a project for every file here
    // without `allowDefaultProject`. That option, used for scripts/ and local/
    // before they had their own tsconfig.json, made `pnpm lint` fail
    // intermittently with "not found by the project service" on those files.
    files: [
      'packages/**/src/**/*.ts',
      'packages/**/src/**/*.tsx',
      'packages/**/test/**/*.ts',
      'packages/**/test/**/*.tsx',
      'scripts/**/*.ts',
      'local/**/*.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
