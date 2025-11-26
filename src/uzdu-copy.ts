#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { checkIsFile, outputConfiguration } from "./utils";

const command = new Command();

command
  .name("uzdu copy")
  .argument("<from>", "a directory or file")
  .argument("<to>", "a directory or file")
  .action(async (from: string, to: string, options: any, command: Command) => {
    const absFrom = path.resolve(from);
    const absTo = path.resolve(to);
    if(absFrom === absTo){
      command.error("Illegal from == to", { exitCode: 33, code: 'copy.error' });
    }
    if(checkIsFile(from) && absTo.endsWith(path.sep)){
      fs.copyFileSync(from, path.join(absTo, path.basename(from)));
    } else fs.cpSync(from ,to, { recursive: true});
  });
command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();