'use client';

import React, { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import TrainingStatus from '../components/TrainingStatus';
import ImageGeneration from '../components/ImageGeneration';


export default function Home() {
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [trainedModelName, setTrainedModelName] = useState(null);

  const handleUploadComplete = (urls) => {
    setUploadedImageUrls(urls);
  };

  const handleTrainingComplete = (modelName) => {
    setTrainedModelName(modelName);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">AI Image Generator</h1>
      <ImageUpload onUploadComplete={handleUploadComplete} />
      <TrainingStatus imageUrls={uploadedImageUrls} onTrainingComplete={handleTrainingComplete}  />
      {trainedModelName && <ImageGeneration modelName={trainedModelName} />}
    </main>
  )
}