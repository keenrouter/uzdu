#! /usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publishTempDir = "publish-temp";
//const packageJsonPathRelative = `../${publishTempDir}/package.json`
const packageJsonPath = resolve(__dirname, '..', '..', publishTempDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
packageJson.version = `0.0.1-alpha.${Date.now()}`;
const publishConfig = packageJson.publishConfig || {};
if(!publishConfig.tag) {
    publishConfig.tag="alpha";
    packageJson.publishConfig = publishConfig;
}
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log(`version ${packageJson.version} saved in ${packageJsonPath}`);