import { Argument, Command, Option } from "commander";
import { getEnvironment, initEnvironment, outputConfiguration, resolvePath, safeIndex, shouldBeDirectory } from "./utils";
import azUpload, { AzureStorageOptions } from "./azure";
import s3Upload, { S3Config } from "./s3";
import { upload as httpUpload}  from "./http";
import { SshConfig, upload as sshUpload } from "./ssh";
import { ConnectConfig } from "ssh2";
import fs from "fs";


const command = new Command();
command
  .description("Upload to Azure, AWS and HTTP server")
  .name("uzdu upload")

command.command("aws")
  .description("upload to AWS S3")
  .argument("<from>", "the directory to upload to the <bucket>")
  .argument("<bucket>", "the AWS S3 bucket[:region[:endpoint]], e.g. \"mybucket\", \"mybucket:us-east-2\" or \"mybucket:my-region:https://my-s3-provider/endpoint\". [:region] overrides S3_REGION environment variables. Expects S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in environment variables")
  .addOption(
    new Option("-d|--dotenv [file]", "use a properties file (i.e. key=value) to load environment variables. For --aws: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_RESION.")
    .preset(".env"))
  .action(async (from: string, bucket: string, options: any, thisCommand: Command) => {
    try{
      if(options.dotenv){
        const theEnv = getEnvironment(options.dotenv);
        initEnvironment(theEnv);
      }
      shouldBeDirectory(from);
      const env: Partial<S3Config> = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      };
      const [bucketName, region, ...rest] = bucket.split(":")
      const endpoint = (rest.length > 0) ? rest.join(":").trim() : undefined;
      const optConfig: Partial<S3Config> = { bucket: bucketName, endpoint, };
      if(region) optConfig.region = region;
      const config = Object.assign(env, optConfig) as S3Config;
      if(!config.accessKeyId) throw new Error("AWS Access Key ID is not specified");
      if(!config.secretAccessKey) throw new Error("AWS Secret Key is not specified");
      if(!config.region) throw new Error("AWS region is not specified");
      await s3Upload(from, config);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 53, code: "aws.upload.error" });
    }
  })

command.command("http")
  .description("upload to HTTP server with PUT method")
  .argument("<from>", "upload this file to a <url>")
  .argument("<url>", "URL for a PUT operation")
  .addOption(
    new Option("--header <http-header>", "HTTP Header, e.g.: --header\"Authentication: cGFzc3dvcmQ=\"")
    .argParser<string[]>((val, acc) => acc?.concat([val]))
    .default([])
  )
  .addOption(
    new Option("-d|--dotenv [file]", "use a properties file (i.e. key=value) to load environment variables.")
    .preset(".env"))
  .action(async (from: string, url: string, options: any, thisCommand: Command) => {
    if(options.dotenv){
      const theEnv = getEnvironment(options.dotenv);
      initEnvironment(theEnv);
    }
    try {
      const urlAddr = new URL(url);
      await httpUpload(from, urlAddr, options.header);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 4117, code: "http.upload.error" });
    }
  });

command.command("azure")
  .alias("az")
  .description("upload to Azure storage accaount")
  .argument("<from>", "upload this directory or file to a [container]")
  .addArgument(new Argument("[container]", "container name").default("$web", "$web"))
  .addOption(
    new Option("-d|--dotenv [file]", "use a properties file (i.e. key=value) to load environment variables. For --azure: AZURE_STORAGE_CONNECTION_STRING")
    .preset(".env"))
  .action(async (from: string, container: string, options: any, thisCommand: Command) => {
    try {
      if(options.dotenv){
        const theEnv = getEnvironment(options.dotenv);
        initEnvironment(theEnv);
      }
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is absent in environment variables. Consider option --dotenv to laod it.");
      }
      shouldBeDirectory(from);
      const azOpt: AzureStorageOptions = {
        connectionString,
        container,
      };
      await azUpload(from, azOpt);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 43, code: "az.upload.error" });
    }
  });

command.command("ssh")
  .description("upload with SSH")
  .argument("<source>", "source directory or file to upload <to_server>")
  .argument("<destination>", "desitnation directory or file")
  .option("--target <target>", "server hostname/ip-address and optional SSH-port, e.g. 10.100.0.1:22")
  .addOption(
    new Option("-d|--dotenv [file]", "use a properties file (i.e. key=value) to load environment variables. For --aws: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_RESION. For --azure: AZURE_STORAGE_CONNECTION_STRING")
    .preset(".env"))
  .addOption(new Option("--targetUsername [targetUsername]", "SSH username for <target>").default("root"))
  .addOption(new Option("--targetKey [targetKey]", "SSH private key"))
  .addOption(new Option("--targetPassword [targetPassword]", "SSH password"))
  .action(async (source: string, destination: string, options: any, thisCommand: Command) => {
    try {
      if(options.dotenv){
        const theEnv = getEnvironment(options.dotenv);
        initEnvironment(theEnv);
      }
      const hostParts = (options.target as string).split(":");
      const host = hostParts[0];
      const sPort = safeIndex(hostParts, 1) || 22;
      const port = Number(sPort);
      const conConfig: Pick<ConnectConfig, "host"|"port"|"username"> = {
        host,
        port,
        username:  options.targetUsername
      };
      const privKeyPath = options.targetKey;
      let password: string | undefined = undefined;
      let privateKey: Buffer | string | undefined = undefined;
      if(privKeyPath){
        const resolvedKeyPath = resolvePath(options.targetKey);
        try {
          privateKey = fs.readFileSync( resolvedKeyPath );
        } catch (e) {
          throw new Error(`Not found private Key file ${resolvedKeyPath}`);
        }
      } else {
        if(!options.targetPassword) throw new Error("Either --targetPassword or --targetKey should be specified");
        password = options.targetPassword;
      }
      const authConfig: SshConfig = password ? {
        password: password as string,
      } : {
        privateKey: privateKey as Buffer | string
      };
      const sshConfig: SshConfig = { ...conConfig, ...authConfig };
      await sshUpload(resolvePath(source), destination, sshConfig);
    } catch (e) {
      console.error(e);
      thisCommand.error((e as Error).message || e as string, { exitCode: 127, code: "ssh.upload.error" });
    }
  });

command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();


