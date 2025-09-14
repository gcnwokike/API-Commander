const { resolve } = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = (env) => {
  const config = {
    mode: env.production ? "production" : "development",
    experiments: {
      asyncWebAssembly: true,
    },
    entry: ["./src/index.js"], // Your main entry file
    target: "node", // Target Node.js for NodeGui applications
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    output: {
      path: resolve(__dirname, "dist"),
      filename: "index.js",
      clean: true, // Cleans the output directory before emit
    },
    plugins: [new CleanWebpackPlugin()], // Ensures dist is clean before new build
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)?$/,
          loader: "ts-loader",
          options: {
            transpileOnly: true,
          },
          exclude: /node_modules/,
        },
        {
          // Rule for image files (png, jpeg, gif, svg)
          test: /\.(png|jpe?g|gif|svg)$/i,
          use: [
            {
              loader: "file-loader",
              options: {
                name: "[name].[ext]", // Keeps original filename (e.g., nodegui.png)
                outputPath: "assets", // <-- **THIS IS THE CRITICAL CHANGE**: Copies to 'dist/assets/'
              },
            },
          ],
        },
        {
          test: /\.node$/, // Rule for native Node.js addons
          use: [
            {
              loader: "native-addon-loader",
              options: { name: "[name]-[hash].[ext]" },
            },
          ],
        },
      ],
    },
  };

  return config;
};
