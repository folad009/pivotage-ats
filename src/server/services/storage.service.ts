import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";
import type { AllowedResumeMimeType } from "@/lib/upload";

const UPLOAD_EXPIRY_SECONDS = 60 * 5;
const DOWNLOAD_EXPIRY_SECONDS = 60 * 5;

function requireS3Config() {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } =
    env;
  if (
    !S3_ENDPOINT ||
    !S3_REGION ||
    !S3_BUCKET ||
    !S3_ACCESS_KEY_ID ||
    !S3_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "File storage is not configured. Set S3_* environment variables.",
    );
  }
  return {
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  };
}

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!s3Client) {
    const config = requireS3Config();
    s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function getBucket(): string {
  return requireS3Config().bucket;
}

export async function createPresignedUploadUrl(
  storageKey: string,
  mimeType: AllowedResumeMimeType,
  size: number,
): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: size,
  });
  return getSignedUrl(client, command, { expiresIn: UPLOAD_EXPIRY_SECONDS });
}

export async function createPresignedDownloadUrl(
  storageKey: string,
  fileName: string,
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: storageKey,
    ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, "")}"`,
  });
  return getSignedUrl(client, command, { expiresIn: DOWNLOAD_EXPIRY_SECONDS });
}

export function isStorageConfigured(): boolean {
  return Boolean(
    env.S3_ENDPOINT &&
      env.S3_REGION &&
      env.S3_BUCKET &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}

export async function deleteStorageObject(storageKey: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: storageKey,
    }),
  );
}

/** Deletes up to 1000 objects per S3 batch request. */
export async function deleteStorageObjects(storageKeys: string[]): Promise<void> {
  if (storageKeys.length === 0) return;

  const client = getS3Client();
  const bucket = getBucket();

  for (let offset = 0; offset < storageKeys.length; offset += 1000) {
    const chunk = storageKeys.slice(offset, offset + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}
