/**
 * Development and linting configuration. Publishing uses
 * babel.publish.config.cjs so consumers receive unconfigured Ember macros.
 */
const { buildMacros } = require('@embroider/macros/babel')

const macros = buildMacros()

module.exports = {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allExtensions: true,
        onlyRemoveTypeImports: true,
        allowDeclareFields: true,
      },
    ],
    [
      'babel-plugin-ember-template-compilation',
      {
        transforms: [...macros.templateMacros],
      },
    ],
    [
      'module:decorator-transforms',
      {
        runtime: {
          import: require.resolve('decorator-transforms/runtime-esm'),
        },
      },
    ],
    ...macros.babelMacros,
  ],
  generatorOpts: {
    compact: false,
  },
}
