import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    return null;
  }

  return new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });
}

function getPublicUrl(key: string): string {
  const base = process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? "";
  const bucket = process.env.S3_BUCKET ?? "";
  return `${base}/${bucket}/${key}`;
}

async function uploadBuffer(
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getS3Client();
  const bucket = process.env.S3_BUCKET;

  if (!client || !bucket) {
    return null;
  }

  const key = `archiwork/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

export async function uploadImageFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/png";

    return uploadBuffer(buffer, contentType);
  } catch (error) {
    console.error("S3 upload from URL failed:", error);
    return null;
  }
}

export async function uploadImageFromDataUrl(
  dataUrl: string
): Promise<string | null> {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    return uploadBuffer(buffer, contentType);
  } catch (error) {
    console.error("S3 upload from data URL failed:", error);
    return null;
  }
}

export async function persistGeneratedImages(
  images: string[]
): Promise<string[]> {
  const results: string[] = [];

  for (const image of images) {
    let stored: string | null = null;

    if (image.startsWith("data:")) {
      stored = await uploadImageFromDataUrl(image);
    } else if (image.startsWith("http")) {
      stored = await uploadImageFromUrl(image);
    }

    results.push(stored ?? image);
  }

  return results;
}

export function isS3Configured(): boolean {
  return !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_BUCKET
  );
}
