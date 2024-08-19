import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const { imageUrls } = await request.json();

    // Create a new zip file
    const zip = new AdmZip();

    // Download each image and add it to the zip
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      zip.addFile(`image_${i + 1}.jpg`, Buffer.from(imageBuffer));
    }

    // Generate zip buffer
    const zipBuffer = zip.toBuffer();

    // Upload zip to S3
    const key = `training-images/training_${Date.now()}.zip`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: zipBuffer,
    });

    await s3Client.send(command);

    // Generate a signed URL for the zip file
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ zipUrl: signedUrl });
  } catch (error) {
    console.error('Error zipping images:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}