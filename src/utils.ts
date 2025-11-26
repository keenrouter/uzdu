import fs from "fs";
import os from "os";
import JSZip, { OutputType } from "jszip";
import mime from "mime-types";
import path from "path";
import { OutputConfiguration } from "commander";

const immutableCacheRegex = /.*\.[a-z0-9]{20}\.(js|map\.js|css|map\.css|js\.LICENSE\.txt)$/gm;
const indexHtmlRegex = /(index\.html|login\.html|loaders\/login\.js|loaders\/result\.js)$/gm;

type Headers = "CacheControl" | "ContentType"
export interface BlobObject {
  /**
   * blob key
   */
  key: string;
  headers?: {
    CacheControl?: string;
    ContentType?: string;
  }
}

/**
 * 
 * @param rootDir a local directory with files to be uploaded
 * @param blobDir a storage directory (e.g. "a", "a/b") where files from rootDir
 * will be uploaded. Default is "";
 * @returns a list of {@link BlobObject}
 */
export async function listBlobs(rootDir: string, blobDir = "", _dir?: string) {
  if(!_dir){
    const lstat = fs.lstatSync(rootDir);
    if(lstat.isFile()){
      const parentDir = path.dirname(rootDir);
      const filePath = rootDir;
      const blob = await createBlobObject(filePath, parentDir, blobDir);
      return [blob];
    }
  }
  const cwd = _dir || rootDir;
  const files = fs.readdirSync(cwd, { withFileTypes: true });
  const fileList = await files.reduce(async (acc, file) => {
      const filePath = path.join(cwd, file.name);
      if (file.isDirectory()) {
        const filesInDir = await listBlobs(rootDir, blobDir, filePath);
        const a = await acc;
        const size = a.length;
        const newSize = a.push(...filesInDir);
        if(size+filesInDir.length != newSize){
          console.warn("Wrong size of directory", size, filesInDir.length, newSize);
        } 
      } else {
        const blob = await createBlobObject(filePath, rootDir, blobDir);
        (await acc).push(blob);
      }
      return await acc;
    }, Promise.resolve<BlobObject[]>([]));

  return fileList;
}
async function createBlobObject(filePath: string, rootDir: string, blobDir: string = ""): Promise<BlobObject> {
  const ContentType = await Promise.resolve( mime.lookup(filePath) );
  const blobName = path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
  const key = blobDir ? `${blobDir}/${blobName}` : blobName;
  const isImmutable = key.match(immutableCacheRegex);
  let CacheControl = isImmutable ? "immutable, max-age=604800, public" : "no-cache";
  const isIndex = key.match(indexHtmlRegex);
  if(isIndex) CacheControl = "max-age=600, stale-while-revalidate=180, stale-if-error=300, public";
  const blob: BlobObject = { key }
  if( CacheControl || ContentType) {
    blob.headers = {};
    if(CacheControl) blob.headers.CacheControl = CacheControl;
    if(ContentType) blob.headers.ContentType = ContentType;
  }
  return blob;
}
export function getEnvironment(file: string = ".env") {
  const envFilePath = path.resolve(process.cwd(), file);
  const txt = fs.readFileSync(envFilePath, { encoding: "utf-8"});
  const lines = txt.split(/\r?\n/);
  const isComment = /^\s*#/;
  return lines.reduce<{[key: string]: string }>( (acc: any, line) => {
    if (isComment.test(line)) return acc;
    const [key, ...rest] = line.split("=")
    if(rest.length > 0) acc[key.trim()] = rest.join("=").trim();
    return acc;
  }, {});
}
/**
 * @param env a parameter structure to be added to {@link process.env}
 */
export function initEnvironment(env: { [key:string]: string }){
  Object.keys(env).forEach( key => process.env[key] = env[key]);
}
/**
 * 
 * @param rootDir 
 * @param _dir 
 * @returns array of file pathes relative to rootDir
 */
export async function listFiles(rootDir: string, _dir?: string) {
  if(!_dir){
    const lstat = fs.lstatSync(rootDir);
    if(lstat.isFile()){
      return [path.basename(rootDir)];
    }
  }
  const cwd = _dir || rootDir;
  const files = fs.readdirSync(cwd, { withFileTypes: true });
  const fileList = await files.reduce(async (acc, file) => {
      const filePath = path.join(cwd, file.name);
      if (file.isDirectory()) {
        const filesInDir = await listFiles(rootDir, filePath);
        (await acc).push(...filesInDir);
      } else {
        const relativeFilePath = path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
        (await acc).push(relativeFilePath);
      }
      return await acc;
    }, Promise.resolve<string[]>([]));

  return fileList;
}
/**
 * Add metadata about files in the `distributive` directory
 * @param distributive path to the directory with files
 * @param metadataFilename a name of the metadata file that will be added to the `distributive` directory, default is `.metadata.json`
 * @returns the same `distributive` path as in the parameter
 */
export async function addMetadata(distributive: string, metadataFilename: string = ".metadata.json"){
  const metadata = await getMetadata(distributive, metadataFilename);
  fs.writeFileSync(path.join(distributive, metadataFilename), metadata);
  return distributive;
}

/**
 * Get metadata about files in `dir` directory
 * @param dir directory to get files for S3 bucket
 * @param metadataFile add metadata to this file as well
 * @returns blobObjects metadata json
 */
async function getMetadata(dir: string, metadataFile?: string): Promise<string>{
  const blobs = await listBlobs(dir);
  //const tmpFolder = fs.mkdtempSync(path.join(os.tmpdir(), 's3dist-'));
  const metadata: {[key: string]: Omit<BlobObject, "key">} = {};
  blobs.forEach( blob => metadata[blob.key] = { ...blob });
  if(metadataFile){
    metadata[metadataFile] = {
      headers: {
        ContentType: "application/json",
        CacheControl: "no-cache",
      }
    }
  }
  return JSON.stringify(metadata, null, 2);
}
/**
 * 
 * @param fromDir 
 * @param zipFilePath 
 * @param metadata a json with metadata
 * @returns 
 */
export async function makeZip(fromDir: string, zipFilePath: string){
  const zip = new JSZip();
  const files = await listFiles(fromDir);
  files.forEach( file => {
    const filePath = path.join(fromDir, file);
    const readStream = fs.createReadStream(filePath);
    zip.file(file, readStream, {binary: true});
  });
  return new Promise<string>((resolve, reject) => {
    zip
    .generateNodeStream({type:'nodebuffer', streamFiles:true})
    .pipe(fs.createWriteStream(zipFilePath))
    .on('finish', function () {
      resolve(zipFilePath);
    });
  });
}
/**
 * 
 * @param fromZip
 * @param toDir
 * @returns resolved toDir
 */
export async function doUnzip(fromZip: string, toDir: string){
  const fileBuffer = fs.readFileSync(fromZip);
  const jsZip = new JSZip();
  const zip = await jsZip.loadAsync(fileBuffer);
  Object.keys(zip.files).forEach((filename) => {
    zip.files[filename].async('nodebuffer').then((fileData) => {
      safeUnzipFileWrite(path.join(toDir, filename), fileData);
    });
  });
  return path.resolve(toDir);
}
function safeUnzipFileWrite(filePath: string, fileData: Buffer) {
  if(filePath.endsWith(path.sep)){
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }
  } else {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    fs.writeFileSync(filePath, fileData);
  }
}

export function checkIsFile(file: string): boolean{
  const absPath = path.resolve(file);
  const lstat = fs.lstatSync(absPath);
  return lstat.isFile();
}

export function shouldBeFile(file: string): void {
  if(!checkIsFile(file)){
    const absPath = path.resolve(file);
    throw new Error(`${file} is a directory, SHOULD be a file. Check [${absPath}]`);
  }
}
export function shouldBeDirectory(directory: string): void {
  const lstat = fs.lstatSync(directory);
  if(!lstat.isDirectory){
    const absPath = path.resolve(directory);
    throw new Error(`${directory} is a file, SHOULD be a directory. Check [${absPath}]`);
  }
}

export const outputConfiguration: OutputConfiguration = {
  writeOut: (str) => process.stdout.write(`\x1b[32m${str}\x1b[0m`),
  writeErr: (str) => process.stderr.write(str),
  // Output errors in red.
  outputError: (str, write) => write(`[ERROR] \x1b[31m${str}\x1b[0m`),
}
/**
 * @param arr 
 * @param index 
 * @returns element[`index`] from array `arr` or undefined
 */
export function safeIndex<T>(arr: T[], index: number): T | undefined {
  return index >= 0 && index < arr.length ? arr[index] : undefined;
}

/**
 * Resolves paths that start with a tilde to the user's home directory.
 *
 * @param filePath '~/GitHub/Repo/file.png'
 * @return '/home/bob/GitHub/Repo/file.png'
 */
 export function resolvePath (filePath: string): string {
  if (!filePath || typeof(filePath) !== 'string') {
    return process.cwd();
  }
  // '~/folder/path' or '~' not '~alias/folder/path'
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace('~', os.homedir());
  }
  return path.resolve(process.cwd(), filePath);
}