const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      background: './src/background.js',
      content: './src/content.js',
      popup: './src/popup.js',
      'ai-integration': './src/ai-integration.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: 'src/manifest.json',
            to: 'manifest.json',
            transform(content) {
              // Inject version from package.json
              const manifest = JSON.parse(content.toString());
              const packageJson = require('./package.json');
              manifest.version = packageJson.version;
              return JSON.stringify(manifest, null, 2);
            }
          },
          { from: 'src/icons', to: 'icons' },
          { from: 'src/config.js', to: 'config.js' }
        ]
      }),
      new HtmlWebpackPlugin({
        template: './src/popup.html',
        filename: 'popup.html',
        chunks: ['popup']
      }),
      ...(isProduction ? [new MiniCssExtractPlugin()] : [])
    ],
    resolve: {
      extensions: ['.js', '.json']
    },
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',
    
    // Define environment variables for the browser
    plugins: [
      ...module.exports.plugins || [],
      new (require('webpack')).DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.VERSION': JSON.stringify(require('./package.json').version),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
      })
    ]
  };
};