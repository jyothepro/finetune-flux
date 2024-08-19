'use client';

import React, { useState } from 'react';

export default function ImageUpload({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setUploadError(null);
    setUploadedImageUrls([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError('Please select files to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const response = await fetch(`/api/getUploadUrl?fileName=${file.name}`);
        if (!response.ok) {
          throw new Error(`Failed to get upload URL: ${response.statusText}`);
        }
        const { signedUrl, key } = await response.json();

        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload to S3: ${uploadResponse.statusText}`);
        }

        const imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        uploadedUrls.push(imageUrl);
      }

      setUploadedImageUrls(uploadedUrls);
      console.log('All uploads successful');
      if (onUploadComplete) {
        onUploadComplete(uploadedUrls);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-8">
      <input
        type="file"
        onChange={handleFileChange}
        className="mb-4"
        accept="image/*"
        multiple
      />
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className={`px-4 py-2 rounded ${
          files.length === 0 || uploading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {uploadError && <p className="text-red-500 mt-2">{uploadError}</p>}
      {uploadedImageUrls.length > 0 && (
        <div className="mt-4">
          <p className="mb-2">Uploaded Images:</p>
          <div className="grid grid-cols-3 gap-4">
            {uploadedImageUrls.map((url, index) => (
              <img key={index} src={url} alt={`Uploaded ${index}`} className="w-full h-auto" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}