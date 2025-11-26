#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { makeZip, outputConfiguration } from "./utils";

const command = new Command();

command
  .name("uzdu zip")
  .argument("<from>", "adding this directory or file to a zip-archive")
  .argument("[to]", "a zip archive (default: <from>.zip)")
  .action(async (from: string, to: string | undefined, options: any, command: Command) => {
    const toZip = to || `${path.basename(from)}.zip`;
    const absToZip = path.resolve(toZip);
    try {
      if(fs.existsSync(absToZip)){
        throw new Error(`${absToZip} already exists, remove it manually.`);
      }
      await makeZip(from, absToZip);
      console.log(absToZip);
    } catch (e) {
      command.error((e as Error).message || e as string, { exitCode: 317, code: 'zip.error' });
    }
  });
command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();