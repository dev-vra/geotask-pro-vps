/**
 * Storage abstraction module — supports 3 backends:
 *
 * 1. LOCAL (default)   — saves to /public/uploads/ (dev or simple deployments)
 * 2. SUPABASE          — when NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set
 * 3. AWS S3            — when AWS_S3_BUCKET + AWS_REGION are set (priority over Supabase)
 *
 * Detection order: S3 > Supabase > Local
 *
 * NOTE: S3 backend uses @aws-sdk/client-s3 which must be installed separately
 * when deploying to AWS: npm install @aws-sdk/client-s3
 * The SDK is loaded dynamically at runtime to avoid build errors.
 */

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

type StorageBackend = "local" | "supabase" | "s3";

interface UploadResult {
  url: string;
  filename: string;
}

function getBackend(): StorageBackend {
  if (process.env.AWS_S3_BUCKET && process.env.AWS_REGION) return "s3";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "supabase";
  return "local";
}

/**
 * Dynamically load @aws-sdk/client-s3 at runtime.
 * Uses eval to prevent Next.js/Turbopack from resolving the module at build time.
 * This module is only needed when AWS_S3_BUCKET is configured.
 * Install it before deploying to AWS: npm install @aws-sdk/client-s3
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadS3SDK(): any {
  // eval hides the require from the bundler's static analysis
  // eslint-disable-next-line no-eval
  return eval('require')("@aws-sdk/client-s3");
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

async function uploadLocal(buffer: Buffer, taskId: number, filename: string): Promise<UploadResult> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "tasks", String(taskId));
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/uploads/tasks/${taskId}/${filename}`, filename };
}

async function uploadSupabase(buffer: Buffer, taskId: number, filename: string): Promise<UploadResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "task-attachments";
  const filePath = `tasks/${taskId}/${filename}`;

  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/octet-stream",
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upload failed: ${err}`);
  }

  const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
  return { url, filename };
}

async function uploadS3(buffer: Buffer, taskId: number, filename: string, mimeType: string): Promise<UploadResult> {
  const { S3Client, PutObjectCommand } = loadS3SDK();

  const s3Config: any = { 
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  };

  if (process.env.AWS_S3_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
    s3Config.forcePathStyle = true; // Required for MinIO
  }

  const client = new S3Client(s3Config);
  const bucket = process.env.AWS_S3_BUCKET!;
  const key = `uploads/tasks/${taskId}/${filename}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  const url = cdnDomain
    ? `https://${cdnDomain}/${key}`
    : process.env.AWS_S3_ENDPOINT 
      ? `${process.env.AWS_S3_ENDPOINT}/${bucket}/${key}`
      : `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { url, filename };
}

export async function uploadFile(
  buffer: Buffer,
  taskId: number,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const backend = getBackend();

  switch (backend) {
    case "s3":
      return uploadS3(buffer, taskId, filename, mimeType);
    case "supabase":
      return uploadSupabase(buffer, taskId, filename);
    default:
      return uploadLocal(buffer, taskId, filename);
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

async function deleteLocal(fileUrl: string): Promise<void> {
  const filePath = path.join(process.cwd(), "public", fileUrl);
  await unlink(filePath);
}

async function deleteSupabase(fileUrl: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "task-attachments";

  // Extract path from full URL
  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const idx = fileUrl.indexOf(publicPrefix);
  const filePath = idx >= 0 ? fileUrl.slice(idx + publicPrefix.length) : fileUrl;

  await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${supabaseKey}` },
  });
}

async function deleteS3(fileUrl: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = loadS3SDK();

  const s3Config: any = { 
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  };

  if (process.env.AWS_S3_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
    s3Config.forcePathStyle = true;
  }

  const client = new S3Client(s3Config);
  const bucket = process.env.AWS_S3_BUCKET!;

  // Extract key from URL
  let key = fileUrl;
  if (fileUrl.includes(".amazonaws.com/")) {
    key = fileUrl.split(".amazonaws.com/")[1];
  } else if (fileUrl.includes(process.env.AWS_CLOUDFRONT_DOMAIN || "__none__")) {
    key = new URL(fileUrl).pathname.slice(1);
  }

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const backend = getBackend();

  switch (backend) {
    case "s3":
      return deleteS3(fileUrl);
    case "supabase":
      return deleteSupabase(fileUrl);
    default:
      return deleteLocal(fileUrl);
  }
}

export function getStorageBackend(): StorageBackend {
  return getBackend();
}
