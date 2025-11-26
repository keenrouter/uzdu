import { defineConfig } from "tsup";
import path from "path";
import fs from "fs";
import packageJson from "./package.json" with { type: "json" }

const parseProperties = (text: string) => {
  const lines = text.split('\n');
  let properties: Record<string, string> = {};
  lines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      const value = values.join("=");
      properties[key.trim()] = value.trim();
    }
  });
  return properties;
}


//const _fullPacakgeJsonPath = process.env.npm_package_json!;
//const _packageJsonRelativePath = path.relative(__dirname,  _fullPacakgeJsonPath);
//const packageJsonPath = "./" + _packageJsonRelativePath.split(path.sep).join(path.posix.sep);
/*
let buildEnv: Record<string, string | undefined> = { GITHUB_RUN_NUMBER: process.env.GITHUB_RUN_NUMBER};
try {
  if(import.meta.env.propertiesFile){
    const data = fs.readFileSync(env.propertiesFile, { encoding: "utf-8"});
    const props = parseProperties(data);
    for (const key in props) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        buildEnv[key] = props[key];
      }
    }
  }
} catch(e){}
console.log(buildEnv);
*/

export default defineConfig({
  entry: [
    "src/uzdu.ts",
    "src/uzdu-upload.ts",
    "src/uzdu-download.ts",
    "src/uzdu-metadata.ts",
    "src/uzdu-zip.ts",
    "src/uzdu-unzip.ts",
    "src/uzdu-copy.ts",
  ],
  clean: true,
  //format: ["cjs"],
  //format: ["esm"],
  dts: true,
  sourcemap: false,
  minify: false,
  define: {
    NPM_PACKAGE_VERSION: process.env.GITHUB_RUN_NUMBER ? JSON.stringify(`${packageJson.version}-build_${process.env.GITHUB_RUN_NUMBER}`) : JSON.stringify(packageJson.version),
    NPM_PACKAGE_DESCRIPTION: JSON.stringify(packageJson.description),
  }
});