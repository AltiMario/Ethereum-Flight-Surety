const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');
const StartServerPlugin = require('start-server-nestjs-webpack-plugin');

module.exports = {
  entry: ['webpack/hot/poll?1000', './src/server/index'],
  watch: true,
  target: 'node',
  externals: [
    nodeExternals({
      allowlist: ['webpack/hot/poll?1000'],
    }),
  ],
	optimization: {
		moduleIds: 'named',
		emitOnErrors: false,
	},
  plugins: [
    new StartServerPlugin('server.js'),
		new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        BUILD_TARGET: JSON.stringify('server'),
      },
    }),
  ],
  output: {
    path: path.join(__dirname, 'build/server'),
    filename: 'server.js',
  },
};
