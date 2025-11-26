import { Client, ConnectConfig, SFTPWrapper, TransferOptions } from "ssh2";
import fs from "node:fs";
import path from "path";
import { listFiles, safeIndex } from "./utils";
import deepmerge from "deepmerge";

export type SshConfig = ConnectConfig & { password: string; privateKey?: undefined } | { password?: undefined ; privateKey: Buffer | string };

export async function upload(source: string, destination: string, sshConfig: SshConfig) {
  await new Promise<void>((resolve, reject) => {
    fs.stat(source, async (err, stats) => {
      if(stats.isSymbolicLink()){
        reject(new Error(`${source} is symlink`));
      } else {
        const sshConnection = await connect(sshConfig);
        try{
          const files = await listFiles(source);
          const _destination = destination.replace(/\/+$/, "");
          const _source = source.replace(/\/+$/, "");
          await mkdirs(sshConnection, _destination, files);
          await uploadFiles(files, _source, _destination, sshConnection);
          resolve();
        } catch (e) {
          console.error("SFTP error", e);
          reject(e);
        } finally {
          sshConnection.destroy();
        }
      }
    });
  });
}

const transferOptions: TransferOptions = {
  concurrency: 2,
  chunkSize: 65536,
  //step: (totalTransferred, chunk, total) => console.log(`Uploaded ${totalTransferred} bytes out of ${total}`)
}

async function mkdirs(sshConnection: Client, destination: string, sources: string[]){
  const fileMap = getDirMap(sources);
  const makeDirs = getMakeDirs(fileMap, destination);
  const commands = makeDirs ? makeDirs.map((dir) => `mkdir -p "${dir}"`) : [`mkdir -p "${destination}"`];
  const commandLine = commands.length > 1 ? commands.join(";") : commands[0];
  await new Promise<void>((res, rej) => {
    sshConnection.exec(commandLine, {}, (err, channel) => {
      if (err) {
        console.error("mkdir error", err);
        rej(new Error(`failed: mkdir -p ... : ${err}`));
      } else {
        channel.on('exit', (code: number, signal: number) => {
          if(code != 0) rej(new Error(`Exit code: ${code} for "mkdir -p ..."`));
          else res();
        })
      }
    });
  });
}

function _uploadFile(source: string, destination: string, sftp: SFTPWrapper){
  return new Promise<void>((resolve,reject) => {
    sftp.stat(destination, async (err, stats) => {
      if(err) {
        sftp.fastPut(source, destination,{}, (err) => { if(err) reject(err); else resolve(); });
      } else if (stats.isFile()) {
        sftp.fastPut(source, destination,{}, (err) => {if(err) reject(err); else resolve();});
      } else if(stats.isDirectory()) {
        const f = path.basename(source);
        reject(new Error(`Overwriting directory ${destination} with the file ${f} is not allowed. Remove the directory manually.`));
      } else {
        reject(new Error("Remote path is symlink"));
      }
    });
  });
}

function uploadFiles(sources: string[], source: string, destination: string, sshConnection: Client){
  return new Promise<void>((resolve, reject) => {
    sshConnection.sftp(async (err, sftp) => {
      if(err){
        console.error("uploadFiles error");
        reject(err);
      } else {
        if(sources.length == 1){
          const lstat = fs.lstatSync(source);
          if(lstat.isFile()){
            const dest = path.join(destination, sources[0]).replace(/\\/g, '/');
            const src = source;
            console.log(`Uploading file ${src} => ${dest}`);
            await _uploadFile(src, dest, sftp)
              .then(() => resolve())
              .catch((e) => {
                console.error(src);
                reject(e);
              });
            return;        
          }
        }
        const promises: Promise<void>[] = [];
        sources.map((f) => {
          const dest = path.join(destination, f).replace(/\\/g, '/');
          const src = path.join(source, f).replace(/\\/g, '/');
          console.log(`Uploading ${src} => ${dest}`);
          const promise = new Promise<void>((res, rej) => {
            _uploadFile(src, dest, sftp)
              .then(() => res())
              .catch((e) => {
                console.error(src);
                rej(e);
              });
          });
          promises.push(promise);
        });
        await Promise.all(promises);
        resolve();
      }
    });
  });
}

async function connect(sshConfig: SshConfig){
  const conn = new Client();
  try {
    return await new Promise<Client>((resolve, reject) => {
      conn
        .on("error", (e) => {
          reject(new Error(`Target host error: ${e}`));
        })
        .on("ready", () => {
          resolve(conn);
        })
        .connect({
          timeout: 99,
          port: 22,
          algorithms: {
            cipher: [
              "aes128-ctr", "aes192-ctr", "aes256-ctr", "aes256-cbc","aes128-cbc"
              //"aes128-gcm", ////"aes128-gcm@openssh.com", //"aes256-gcm", ////"aes256-gcm@openssh.com", ////"aes192-cbc",
            ]
          },
          ...sshConfig
        })
    });
  } catch (e) {
    console.error("Connection failed", e);
    conn.destroy();
    throw e;
  }
}

type FileMapEntry = { [key:string]: false | FileMapEntry };
export function getMakeDirs(fileMap: FileMapEntry, destination?: string): false | string[] {
  const kv: [string, false | FileMapEntry][] = Object.entries(fileMap);
  const hasSubdirs = kv.some((keyVal) => !!keyVal[1]);
  if(!hasSubdirs) return false;
  const subdirs = kv.reduce<string[]>((acc, curr) => {
    if(curr[1]){
      const res = getMakeDirs(curr[1]);
      const prefix = destination ? [destination, curr[0]].join("/") : curr[0];
      if (res) {
        const pathes = res.map((apath) => [prefix, apath].join("/"));
        acc.push(...pathes);
      } else acc.push(prefix);
    }
    return acc;
  }, []);
  return subdirs;
}
export function getDirMap(files: string[]): FileMapEntry {
  let fileMap: FileMapEntry = {};
  files.map((file) => {
    const leaf = getFileMap(file);
    fileMap = deepmerge(fileMap, leaf);
  });
  return fileMap;
}
function getFileMap(file: string): FileMapEntry {
  let theFile = file;
  if( file.indexOf("/") == 0 ) theFile = file.substring(1);
  const parts = theFile.split("/");
  if(parts.length == 1) return { [parts[0]]: false };
  else {
    const aFile = path.join(...parts.slice(1)).replace(/\\/g, '/');
    const fileMapEntry = getFileMap(aFile);
    return { [parts[0]]: fileMapEntry };
  }
}