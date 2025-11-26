#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { doUnzip, makeZip, outputConfiguration } from "./utils";

const command = new Command();

command
  .name("uzdu unzip")
  .argument("<from>", "a zip archive")
  .argument("[to]", "a directory for unzipped files")
  .action(async (from: string, to: string | undefined, options: any, command: Command) => {
    const toDir = to || `${path.basename(from)}`;
    try {
      const absToDir = path.resolve(toDir);
      if(fs.existsSync(absToDir)) throw new Error(`Directory ${absToDir} already exists. Won't overwrite it.`)   
      await doUnzip(from, absToDir);
    } catch (e) {
      command.error((e as Error).message || e as string, { exitCode: 317, code: 'unzip.error' });
    }
  });
command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();