import { PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { BlobObject, listFiles } from "./utils";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  endpoint?: string;
  bucket: string;
}

export default async function upload(dir: string, s3config: S3Config, metadataFile: string = ".metadata.json"){
  if(!s3config.accessKeyId || !s3config.secretAccessKey || !s3config.region) {
    throw Error("AWS credenitals not found in environement vairabes (AWS_KEY_ID, AWS_SECRET_KEY, AWS_REGION) - put them in .env file in the pwd directory");
  }
  if(!s3config.bucket){
    throw new Error("bucket name is required for S3");
  }
  const { accessKeyId, secretAccessKey, region, endpoint } = s3config;
  const client = new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region,
    endpoint,
  });
  let dist = path.resolve(process.cwd(), dir);
  const files = await listFiles(dist);
  let metadata: {[key: string]: BlobObject};
  try {
    const metadataJson = fs.readFileSync(path.join(dir, metadataFile),  { encoding: "utf-8"});
    metadata = JSON.parse(metadataJson);
  }catch (e) {}
  if(files.length == 1){ //hm... is dist a file? let's check
    const lstat = fs.lstatSync(dist);
    if(lstat.isFile()){
      dist = path.dirname(dist);
    }
  }
  await Promise.all(files.map(async (file) => {
    const filePath = path.resolve(dist, file);
    const fileContent = fs.readFileSync(filePath);
    const params: PutObjectCommandInput = {
      Bucket: s3config.bucket,
      Key: file,
      Body: fileContent,
    };
    if(metadata){
      const blobObj = metadata[file];
      if(blobObj && blobObj.headers){
        const {CacheControl, ContentType } = blobObj.headers;
        if(CacheControl) params.CacheControl = CacheControl;
        if(ContentType) params.ContentType = ContentType;
      }
    }
    return new Upload({
        client,
        params,
        tags: [],
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
    }).done();
  }));
}