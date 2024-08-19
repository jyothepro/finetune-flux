'use client';

import { useState, useEffect } from 'react';

export default function TrainingStatus({ imageUrls = [], onTrainingComplete }) {
  const [modelName, setModelName] = useState(null);
  const [trainingId, setTrainingId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const isTrainingDisabled = imageUrls.length === 0 || status !== 'idle';

  const createModelAndStartTraining = async () => {
    if (imageUrls.length === 0) {
      setError('Please upload at least one image before starting training.');
      return;
    }

    setStatus('creating_model');
    setError(null);

    try {
      // Create model
      const modelResponse = await fetch('/api/createModel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `flux-model-${Date.now()}`,
          description: "A Flux fine-tuned model",
        }),
      });

      if (!modelResponse.ok) {
        throw new Error('Failed to create model');
      }

      const modelData = await modelResponse.json();
      setModelName(modelData.name);

      // Start training
      setStatus('starting_training');
      const trainingResponse = await fetch('/api/startTraining', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageUrls,
          modelName: modelData.name,
        }),
      });

      if (!trainingResponse.ok) {
        throw new Error('Failed to start training');
      }

      const trainingData = await trainingResponse.json();
    
      setTrainingId(trainingData.id);
      setStatus('in_progress');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };


  useEffect(() => {
    let intervalId;

    const checkTrainingStatus = async () => {
      if (trainingId && status === 'in_progress') {
        try {
          const response = await fetch(`/api/checkTrainingStatus?trainingId=${trainingId}`);
          const data = await response.json();

          if (data.status === 'succeeded') {
            setStatus('completed');
            if (onTrainingComplete) {
              onTrainingComplete(modelName);
            }
            clearInterval(intervalId);
          } else if (data.status === 'failed') {
            setStatus('failed');
            setError('Training failed');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error checking training status:', error);
        }
      }
    };

    if (status === 'in_progress') {
      intervalId = setInterval(checkTrainingStatus, 10000); // Check every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [trainingId, status, modelName, onTrainingComplete]);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Training Status</h2>
      <button
        onClick={createModelAndStartTraining}
        disabled={isTrainingDisabled}
        className={`px-4 py-2 rounded ${
          isTrainingDisabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {status === 'idle' ? 'Create Model and Start Training' : 'Processing...'}
      </button>
      {modelName && (
        <p className="mt-4">Model Name: {modelName}</p>
      )}
      {trainingId && (
        <p className="mt-4">
          Training ID: {trainingId}<br/>
          Training URL: https://replicate.com/p/{trainingId}
        </p>
      )}
      {status === 'creating_model' && (
        <p className="mt-4">Creating model...</p>
      )}
      {status === 'starting_training' && (
        <p className="mt-4">Starting training...</p>
      )}
      {status === 'in_progress' && (
        <p className="mt-4">Training is in progress...</p>
      )}
      {status === 'completed' && (
        <p className="mt-4 text-green-500">Training completed successfully!</p>
      )}
      {status === 'failed' && (
        <p className="mt-4 text-red-500">Training failed. Please try again.</p>
      )}
      {error && (
        <p className="mt-4 text-red-500">{error}</p>
      )}
    </div>
  );
}