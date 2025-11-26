import path from "path";
import webpack, { dependencies } from "webpack";
import CopyPlugin from "copy-webpack-plugin";


const config = async (env: any, options: { config: string[], env: any}): Promise<webpack.Configuration> => {
  const _fullPacakgeJsonPath = process.env.npm_package_json!;
  const _packageJsonRelativePath = path.relative(__dirname,  _fullPacakgeJsonPath);
  const packageJsonPath = "./" + _packageJsonRelativePath.split(path.sep).join(path.posix.sep)
  return {
    entry: {
      uzdu: "./src/uzdu.ts",
      "uzdu-upload": "./src/uzdu-upload.ts",
      "uzdu-download": "./src/uzdu-download.ts",
      "uzdu-metadata": "./src/uzdu-metadata.ts",
      "uzdu-zip": "./src/uzdu-zip.ts",
      "uzdu-unzip": "./src/uzdu-unzip.ts",
      "uzdu-copy": "./src/uzdu-copy.ts",
    },
    mode: "production",
    target: "node",
    devtool: false,
    module: {
      rules: [
        {
          exclude: /(node_modules)/,
          test: /\.[tj]sx?$/,
          //loader: "babel-loader"
          loader: "ts-loader"
        }
      ]
    },
    plugins: [
      new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
      new webpack.DefinePlugin({
          NPM_PACKAGE_VERSION: JSON.stringify(process.env.npm_package_version),
          NPM_PACKAGE_DESCRIPTION: JSON.stringify( (await import(packageJsonPath) as any).description ),
      }),
      new CopyPlugin({
        patterns: [
          { from: "package.json", to: "package.json", 
            transform: (input, absoluteFilename)=>{
              const original = JSON.parse(input.toString());
              const { name, version, description, bin, keywords, author, licence, engines, dependencies } = original;
              const target = {
                name, version, description, bin, keywords, author, licence, engines, dependencies
              }
              return JSON.stringify(target, null, 2);
          }},
        ],
      }),
    ],
    output: {
      path: path.resolve(__dirname, "./dist"),
      chunkFilename: "[name].js",
      filename: '[name].js',
      clean: true,
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"]
    }
  }
};

export default config;