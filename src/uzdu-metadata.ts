import { Argument, Command } from "commander";
import { addMetadata, makeZip, outputConfiguration, shouldBeDirectory } from "./utils";

const command = new Command();

command
  .name("uzdu meta")
  .argument("<dir>", "a directory")
  .addArgument(new Argument("[metadata-file]", "a JSON-file with directory metadata, that will be added to the same directory")
    .default(".metadata.json"))
  .action(async (dir: string, metadataFile: string) => {
    try {
      shouldBeDirectory(dir);
      await addMetadata(dir, metadataFile);
    } catch (e) {
      command.error((e as Error).message || e as string, { exitCode: 111, code: "metadata.error" });
    }
  });
command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();