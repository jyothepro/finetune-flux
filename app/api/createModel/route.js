import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, description } = await request.json();

    const response = await fetch('https://api.replicate.com/v1/models', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: process.env.REPLICATE_USERNAME, 
        name: name,
        description: description,
        visibility: "private",
        hardware: "gpu-t4",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Replicate API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}