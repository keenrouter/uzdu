import { Argument, Command, Option } from "commander";
import { checkIsFile, getEnvironment, initEnvironment, outputConfiguration, shouldBeDirectory } from "./utils";
import { download as  httpDownload}  from "./http";
import path from "path";
import fs from "fs";


const command = new Command();
command
  .name("uzdu download")


command.command("http")
  .description("downloads from URL")
  .argument("<url>", "download URL")
  .argument("[to]", "a file or directory to save a download file: e.g.: temp/a.zip, temp/")
  .addOption(
    new Option("--header <http-header>", "HTTP Header, e.g.: --header\"Authentication: cGFzc3dvcmQ=\"")
    .argParser<string[]>((val, acc) => acc?.concat([val]))
    .default([])
  )
  .addOption(
    new Option("-d|--dotenv [file]", "use a properties file (i.e. key=value) to load environment variables. For --aws: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_RESION. For --azure: AZURE_STORAGE_CONNECTION_STRING")
    .preset(".env"))
  .action(async (url: string, to: string | undefined, options: any, thisCommand: Command) => {
    if(options.dotenv){
      const theEnv = getEnvironment(options.dotenv);
      initEnvironment(theEnv);
    }
    try {
        const urlAddr = new URL(url);
        let toFile;
        if(to){
          if(to.endsWith("/")){
            const [...parts] = urlAddr.pathname.split("/");
            toFile = path.resolve(to, parts.pop() || "download.file");     
          } else {
            toFile = path.resolve(to);
          }
        } else {
          const [...parts] = urlAddr.pathname.split("/");
          toFile = path.resolve(parts.pop() || "download.file"); 
        }
        const dir = path.dirname(toFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, {recursive: true});
        }
        await httpDownload(urlAddr, options.header)
          .then(async (resp) => {
            const destination = path.resolve(toFile);
            //const fileStream = fs.createWriteStream(desitnation, { flags: 'wx' });
            const blob = await resp.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(destination, buffer);
          });
        return;
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 4117, code: "http.download.error" });
    }
  });


command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();


