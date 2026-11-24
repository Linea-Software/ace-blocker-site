import prettier from 'eslint-config-prettier';
import neverthrow from '@ninoseki/eslint-plugin-neverthrow';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	globalIgnores(['.agents/**', 'src/lib/server/db/auth-schema.ts', 'file-routes.d.ts']),
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.builtin } },
		rules: {
			// TypeScript tracks symbol resolution; ESLint's JS rule is not applicable.
			'no-undef': 'off'
		}
	},
	{
		files: ['src/lib/server/**/*.ts', 'src/routes/download/**/*.ts'],
		plugins: { neverthrow },
		rules: { 'neverthrow/must-use-result': 'error' },
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url))
			}
		}
	}
);
