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

async function uploadToReplicate(zipBuffer) {
    // Get upload URL
    const uploadResponse = await fetch('https://dreambooth-api-experimental.replicate.com/v1/upload/data.zip', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
  
    if (!uploadResponse.ok) {
      throw new Error(`Failed to get upload URL: ${uploadResponse.statusText}`);
    }
  
    const uploadData = await uploadResponse.json();
  
    // Upload zip file
    const putResponse = await fetch(uploadData.upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip',
      },
      body: zipBuffer,
    });
  
    if (!putResponse.ok) {
      throw new Error(`Failed to upload zip file: ${putResponse.statusText}`);
    }
  
    return uploadData.serving_url;
}

async function zipImages(imageUrls) {
    const zip = new AdmZip();
  
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      zip.addFile(`image_${i + 1}.jpg`, Buffer.from(imageBuffer));
    }
  
    return zip.toBuffer();
}

async function zipAndUploadImages(imageUrls) {
  const zip = new AdmZip();

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    zip.addFile(`image_${i + 1}.jpg`, Buffer.from(imageBuffer));
  }

  const zipBuffer = zip.toBuffer();

  const key = `training-images/training_${Date.now()}.zip`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: zipBuffer,
  });

  await s3Client.send(command);

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return signedUrl;
}

export async function POST(request) {
  try {
    const { imageUrls, modelName } = await request.json();

    //const zipUrl = await zipAndUploadImages(imageUrls);

    const zipBuffer = await zipImages(imageUrls);
    const servingUrl = await uploadToReplicate(zipBuffer);

    const trainingInput = {
      input_images: servingUrl,
      steps: 1000,
    };
    console.log("Model Name: " + process.env.REPLICATE_USERNAME + '/' + modelName);

    const response = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/4ffd32160efd92e956d39c5338a9b8fbafca58e03f791f6d8011f3e20e8ea6fa/trainings', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: trainingInput,
        destination: `${process.env.REPLICATE_USERNAME}/${modelName}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Replicate API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("Training Complete: " + JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting training:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}