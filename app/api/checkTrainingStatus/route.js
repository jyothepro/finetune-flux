import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trainingId = searchParams.get('trainingId');

  if (!trainingId) {
    return NextResponse.json({ error: 'Training ID is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.replicate.com/v1/trainings/${trainingId}`, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ status: data.status });
  } catch (error) {
    console.error('Error checking training status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}