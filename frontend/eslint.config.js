import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const HTML_SINKS = '/^(innerHTML|outerHTML)$/'

const restrictedSyntax = [
  // dangerouslySetInnerHTML: as a JSX attribute, or as an object key (covers
  // JSX spread `{...{ dangerouslySetInnerHTML }}` and createElement props).
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'Never use dangerouslySetInnerHTML (design brief section 8).',
  },
  {
    selector: "Property[key.name='dangerouslySetInnerHTML'], Property[key.value='dangerouslySetInnerHTML']",
    message: 'Never use dangerouslySetInnerHTML, not even via spread or createElement props.',
  },
  // Raw element factories bypass the JSX attribute checks above.
  {
    selector:
      "CallExpression[callee.name=/^(createElement|cloneElement)$/], CallExpression[callee.property.name=/^(createElement|cloneElement)$/]:not([callee.object.name='document'])",
    message: 'Use JSX, not React createElement/cloneElement (keeps the JSX lint guards effective).',
  },
  {
    selector:
      "ImportDeclaration[source.value='react/jsx-runtime'], ImportDeclaration[source.value='react/jsx-dev-runtime']",
    message: 'Do not import the JSX runtime directly; write JSX.',
  },
  {
    selector: "JSXAttribute[name.name='style']",
    message: 'Style through CSS modules and tokens, not style props (CSP style-src self).',
  },
  {
    selector: 'JSXAttribute > Literal[value=/^\\s*javascript:/i]',
    message: 'No javascript: URLs.',
  },
  // DOM HTML sinks.
  {
    selector: `AssignmentExpression > MemberExpression.left[property.name=${HTML_SINKS}], AssignmentExpression > MemberExpression.left[property.value=${HTML_SINKS}]`,
    message: 'Never assign innerHTML/outerHTML; build nodes or use textContent.',
  },
  {
    selector:
      "CallExpression[callee.property.name='insertAdjacentHTML'], CallExpression[callee.property.value='insertAdjacentHTML']",
    message: 'Never use insertAdjacentHTML.',
  },
]

// import.meta is limited to `import.meta.url` (non-computed) everywhere except
// src/content/loader.ts. This also catches `const m = import.meta`,
// destructuring `const { env } = import.meta` and `import.meta['env']`.
const importMetaRule = {
  selector:
    "MetaProperty[meta.name='import']:not(MemberExpression[computed=false][property.name='url'] > MetaProperty.object)",
  message: 'Only src/content/loader.ts may use import.meta (other than import.meta.url).',
}

const securityRules = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
}

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      ...securityRules,
      'no-restricted-syntax': ['error', ...restrictedSyntax, importMetaRule],
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'virtual:site-content', message: 'Import content via src/content/loader.ts.' }],
        },
      ],
    },
  },
  {
    files: ['src/content/loader.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/test/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
])
