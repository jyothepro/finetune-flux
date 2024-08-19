import { NextResponse } from 'next/server';

async function getLatestModelVersion(modelName) {
    console.log("modelName: " + `https://api.replicate.com/v1/models/${process.env.REPLICATE_USERNAME}/${modelName}/versions`);
    const response = await fetch(`https://api.replicate.com/v1/models/${process.env.REPLICATE_USERNAME}/${modelName}/versions`, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch model information: ${response.statusText}`);
    }
  
    const data = await response.json();
    console.log(data);
    return data.results[0].id;
  }

export async function POST(request) {
  try {
    const { prompt, modelName } = await request.json();
    const latestVersion = await getLatestModelVersion(modelName);

    // Call Replicate API to generate image
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: latestVersion,
        input: { 
            model: "dev",
            prompt: prompt,
            output_format: "png",
            output_quality: 90
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Replicate API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Poll for the result
    const predictionId = data.id;
    let imageUrl = null;
    while (!imageUrl) {
      await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for 1 second
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
      const statusData = await statusResponse.json();
      if (statusData.status === 'succeeded') {
        imageUrl = statusData.output;
      } else if (statusData.status === 'failed') {
        throw new Error('Image generation failed');
      }
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}