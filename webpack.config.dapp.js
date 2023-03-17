const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
	entry: [
		path.join(__dirname, 'src/dapp'),
	],
	output: {
		path: path.join(__dirname, 'build/dapp'),
		filename: 'bundle.js'
	},
	module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(jpe?g|png|gif)$/i,
  			type: "asset/resource"
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
	plugins: [
		new NodePolyfillPlugin(),
		new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/dapp/index.html")
    })
	],
	resolve: {
    extensions: [".js"]
  },
	devServer: {
    static: {
      directory: path.join(__dirname, 'dapp'),
    },
		port: 8000,
  }
};