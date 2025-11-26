#! /usr/bin/env node

import { Command } from "commander";
import { outputConfiguration } from "./utils";


declare const NPM_PACKAGE_VERSION: string;
declare const NPM_PACKAGE_DESCRIPTION: string;
let version, description;
try {
  version = NPM_PACKAGE_VERSION;
  description = NPM_PACKAGE_DESCRIPTION;
} catch (e) {
  if(e instanceof ReferenceError) {
    version = "0.0.1-dev";
    description = "Universal zipper, downloader and uploader"
  }
  else throw e;
}

const program = new Command();

program
  .name("uzdu")
  .version(version)
  .description(description)

program.command("upload", "uploads a file or directory")
  .alias("up");

program.command("download", "downloads from URL")
  .alias("down");

program.command("zip", "create zip-archive from a directory or a file");
program.command("unzip", "unzip archive to a directory");
program.command("copy", "copy files and directories");
program.command("metadata", "Create a metadate (i.e. mostly information for HTTP headers), depending on specific patterns for files.")
  .alias("meta")
  //.description("create zip-archive from a directory or a file")
  //.argument("<from>", "adding this directory or file to a zip-archive")
  //.argument("[to]", "a zip archive, if unspecified will save to the file named <from>.zip")
  //.action(zipHandler)


  //.command("zip", "some")


    /*
  .addOption(
    new Option("--azure [container]", "upload to Azure container, expects AZURE_STORAGE_CONNECTION_STRING in environemnt variables - you may use --dotenv")
    .preset("$web")
    .conflicts(["http", "aws", "zip"]))
  .addOption(
    new Option("--aws <bucket>", "upload to AWS S3 bucket[:region[:endpoint]], e.g. \"mybucket\", \"mybucket:us-east-2\" or \"mybucket:my-region:https://my-s3-provider/endpoint\". [:region] overrides S3_REGION environment variables. Expects S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in environment variables")
      .conflicts(["http", "azure", "zip"]))
  .addOption(
    new Option("--http <URL>", "An URL to upload a directory or a file with HTTP")
    .conflicts(["azure", "aws", "zip"]))
  .addOption(
    new Option("--header <http-header>", "HTTP Header, e.g.: --header\"Authentication: cGFzc3dvcmQ=\"")
    .argParser<string[]>((val, acc) => acc?.concat([val]))
    .conflicts(["azure", "aws", "zip"])
  )
  .addOption(
    new Option("-z|--zip [zipfile]", "zip to \"zipfile\"")
    .conflicts(["azure", "aws", "http"])
  )
  .addOption(
    new Option("-m|--metadata", "Adds .metadata.json file to target dir")
    .preset(".metadata.json"))
  .option("-d|--download", "Download, instead of upload for http")
  */
  /*
    if(options.metadata){
      console.log("meta", options.meta);
      shouldBeDirectory(dirOrFile);
      await addMetadata(dirOrFile)
    }
    /////////// uploaders //////////////
    if(options.azure){
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is absent in environment variables");
      }
      shouldBeDirectory(dirOrFile);
      const azOpt: AzureStorageOptions = {
        connectionString,
        container: (typeof options.azure === "string") ? options.azure : undefined
      };
      return await azUpload(dirOrFile, azOpt);
    }
    if (options.aws) {
      shouldBeDirectory(dirOrFile);
      const env: Partial<S3Config> = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      };
      const bucketString = options.aws as string;
      const [bucket, region, ...rest] = bucketString.split(":")
      const endpoint = (rest.length > 0) ? rest.join(":").trim() : undefined;
      const optConfig: Partial<S3Config> = { bucket, endpoint, };
      if(region) optConfig.region = region;
      const config = Object.assign(env, optConfig) as S3Config;
      if(!config.accessKeyId) throw new Error("AWS Access Key ID is not specified");
      if(!config.secretAccessKey) throw new Error("AWS Secret Key is not specified");
      if(!config.region) throw new Error("AWS region is not specified");
      await s3Upload(dirOrFile, config);
      return;
    }
    if (options.http) {
      const url = new URL(options.http);
      if(options.download){
        let toFile;
        if(checkIsFile(dirOrFile)) toFile = dirOrFile;
        else {
          const [...parts] = url.pathname.split("/");
          toFile = path.resolve(dirOrFile, parts.pop() || "download.file");                
        }
        await httpDownload(url, options.header)
          .then(async (resp) => {
            const destination = path.resolve(toFile);
            //const fileStream = fs.createWriteStream(desitnation, { flags: 'wx' });
            const blob = await resp.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(destination, buffer);
          });
        return;
      } else {
        await httpUpload(dirOrFile, url, options.header);
        return;
      }
    }

    if(options.zip) {
      console.log("zip", options.zip)
      const zipFile = typeof options.zip === "string" ? options.zip : `${dirOrFile}.zip`;
      await makeZip(dirOrFile, zipFile);
      return;
    }
  });
    */
  
program.configureOutput(outputConfiguration);
//program.parseAsync();


async function main(){
  await program.parseAsync();
}
main()
  .catch((e) => {
    console.error("Catch it!", e);
    process.exit(20);
  });

export { program };

