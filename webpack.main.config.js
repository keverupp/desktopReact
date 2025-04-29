const path = require("path");
const webpack = require("webpack");
require("dotenv").config();

module.exports = {
  /**
   * Este é o ponto de entrada principal para o processo principal.
   */
  entry: "./src/main.js",

  module: {
    rules: require("./webpack.rules"), // suas regras continuam
  },

  plugins: [
    new webpack.DefinePlugin({
      "process.env.STEAMGRIDDB_API_KEY": JSON.stringify(
        process.env.STEAMGRIDDB_API_KEY
      ),
    }),
  ],
};
