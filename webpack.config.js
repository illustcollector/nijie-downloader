const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const config = {
    entry: {
      content: './src/content.ts',
      background: './src/background.ts',
      options: './src/options.ts',
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].js',
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    // import 文で .ts ファイルを解決するため
    resolve: {
      extensions: ['.ts'],
    },
    plugins: [
      new CopyPlugin({
        patterns: [{ from: 'public' }],
      }),
    ],
  };
  if (argv.mode === 'development') {
    config['devtool'] = 'inline-source-map';
  }
  return config;
};
