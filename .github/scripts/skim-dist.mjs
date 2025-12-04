#! /usr/bin/env node

import { readFileSync, writeFileSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import relConfig from "../../release.config.mjs";

const args = getArgs();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildDir = resolve(__dirname, '..', '..', args.buildDir || "dist");
const releaseNpmPlugin = relConfig.plugins.find((plugin) => {
  if(Array.isArray(plugin) && plugin[0] == "@semantic-release/npm") return true;
  return false;
});
const pkgRoot = Array.isArray(releaseNpmPlugin) ? releaseNpmPlugin[1].pkgRoot : undefined;
const publishTempDir = pkgRoot || args.publishTempDir;
console.info(`Temporary distribution directory: ${publishTempDir}`);
const originalPackageJsonPath = resolve(__dirname, '..', '..', 'package.json');
const originalPackageJson = JSON.parse(readFileSync(originalPackageJsonPath, 'utf8'));
const { 
  name, version, description, bin, type, main, types, 
  keywords, author, repository, license, dependencies,
  engines
} = originalPackageJson;
const publishConfig = originalPackageJson.publishConfig || {};
if(!publishConfig.tag) {
    publishConfig.tag="latest";
}
const files = ["lib"];
const packageJson = {
  name, version, description, bin, type, main, types, 
  keywords, author, repository, license, dependencies,
  engines, files
}
cpSync(buildDir, resolve(__dirname, '..', '..', publishTempDir, "lib"), { recursive: true });
writeFileSync(resolve(__dirname, '..', '..', publishTempDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

/**
 * 
 * @returns {{buildDir: string, sourceImage: {tag: string, arch: string[]}}} - agruments as object
 */
function getArgs(){
  const argsObject =  process.argv.reduce((args, arg) => {
    console.debug("Arguments:", arg);
    // long arg
    if (arg.slice(0, 2) === "--") {
      const longArg = arg.split("=");
      const longArgFlag = longArg[0].slice(2);
      const longArgValue = longArg.length > 1 ? longArg[1] : true;
      args[longArgFlag] = longArgValue;
    }
    // flags
    else if (arg[0] === "-") {
      const flags = arg.slice(1).split("");
      flags.forEach((flag) => {
        args[flag] = true;
      });
    }
    return args;
  }, {});
  return argsObject;
}