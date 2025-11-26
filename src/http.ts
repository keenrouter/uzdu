import fs from "fs";
import path from "path";
import * as utils from "./utils";

const isDebug = process.env.DEBUG?.toLowerCase() === "true";

export async function upload(dirOrFile: string, url: URL, headers?: string[]){
  let distr = path.resolve(process.cwd(), dirOrFile);
  if(isDebug) console.debug(`Listing files from ${distr} ...`);
  const files = await utils.listFiles(distr);
  if(isDebug) console.log(`files to upload:  ${files.length}`);
  let singleUrl: URL;
  if(files.length == 1){ //hm... is dist a file? let's check
    const lstat = fs.lstatSync(distr);
    if(lstat.isFile()){
      distr = path.dirname(distr);
      singleUrl = url.href.endsWith("/") ? new URL(`${url.href}${path.basename(distr)}`) : url;
    }
  }
  const fixedBaseUrl = url.href.endsWith("/") ? url : new URL(`${url.href}/`);
	await Promise.all(files.map(async (file) => {
    if(isDebug) console.log(`filename: ${file}`);
    const localFilePath = path.resolve(distr, file);
		const fileUrl = singleUrl || new URL(`${fixedBaseUrl}${file}`);
    if(isDebug) console.log(`uploading ${localFilePath} => ${fileUrl}`);
    await uploadFile(localFilePath, fileUrl, headers);
  }));
}

const createBlobFromFile = async (path: string) => new Blob([new Uint8Array(await fs.promises.readFile(path))]);
async function uploadFile(file: string, url: URL, headers?: string[]){
	const headersMap = headers?.reduce((acc, headerKv) => {
		const [key, ...rest] = headerKv.split(":")
    if(rest.length > 0) acc[key.trim()] = rest.join("=").trim();
		return acc;
	}, {} as {[key:string]: string});
	if(isDebug) console.log("headersMap", headersMap);
	//const readableStream = fs.createReadStream(file);
	const requestOptions = {
		method: "PUT",
		headers: {
			Accept: "*/*",
			...headersMap
		},
		body: await createBlobFromFile(file),
		duplex: "half",
		redirect: "follow"
	} as RequestInit;
	const resp = await fetch(url, requestOptions);
	if(!resp.ok){
		if(isDebug) {
			console.log("======= request headers ==========");
			console.dir(requestOptions.headers);
			console.log("======= response ==========");
			console.dir(resp);
		}
		throw new Error(String(resp.status));
	}
	return resp;
}

export async function download(url: URL, headers?: string[]){
  const isDebug = process.env.DEBUG?.toLowerCase() === "true";
	const headersMap = headers?.reduce((acc, headerKv) => {
		const [key, ...rest] = headerKv.split(":")
    if(rest.length > 0) acc[key.trim()] = rest.join("=").trim();
		return acc;
	}, {} as {[key:string]: string});
	if(isDebug) console.log("headersMap", headersMap);
	//const readableStream = fs.createReadStream(file);
	const requestOptions = {
		method: "GET",
		headers: {
			Accept: "*/*",
			...headersMap
		},
		redirect: "follow"
	} as RequestInit;
	const resp = await fetch(url, requestOptions);
	if(!resp.ok){
		if(isDebug) {
			console.log("======= request headers ==========");
			console.dir(requestOptions.headers);
			console.log("======= response ==========");
			console.dir(resp);
		}
		throw new Error(String(resp.status));
	}
	return resp;
}