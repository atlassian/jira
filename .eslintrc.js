{
	"env": {
		"browser": false,
		"es6": true,
		"node": true
	},
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"project": "tsconfig.json",
		"sourceType": "module"
	},
	"plugins": [
		"@typescript-eslint",
		"jest",
		"import"
	],
	"extends": [
		"eslint:recommended",
		"plugin:jest/recommended",
		"plugin:import/recommended",
		"plugin:import/typescript",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended"
	],
	"settings": {
		"import/parsers": {
			"@typescript-eslint/parser": [
				".ts",
				".tsx"
			]
		},
		"import/resolver": {
			"typescript": {
				"alwaysTryTypes": true
			}
		}
	},
	"rules": {
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-var-requires": "error",
		"@typescript-eslint/no-unused-vars": "error",
		"no-unused-vars": "off",
		"no-console": "error",
		"quotes": [
			"error",
			"double",
			{
				"avoidEscape": true,
				"allowTemplateLiterals": true
			}
		],
		"indent": ["error", "tab", {
			"SwitchCase": 1
		}],
		"@import/no-unresolved": "off",
		"object-curly-spacing": ["error", "always"],
		"semi": ["error", "always"],
		"no-trailing-spaces": "error",
		"comma-dangle": "error",
		"keyword-spacing": "error",
		"space-in-parens": ["error", "never"],
		"func-style" : ["error", "expression"],
		"require-await": "off",
		"@typescript-eslint/no-floating-promises": ["error"],
		"jest/expect-expect": [
			"error",
			{
				"assertFunctionNames": [
					"expect",
					"supertest.**.expect",
					"*.expect"
				]
			}
		]
	},
	"overrides": [{
		"files": [ "src/**/*.test.ts" ],
		"rules": {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-non-null-assertion": "off"
		}
	}]
}
