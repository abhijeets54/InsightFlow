'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import SampleDatasets from './SampleDatasets';
import Toast from './Toast';

interface FileUploadProps {
  onUploadSuccess: (data: any) => void;
  userId: string;
}

export default function FileUpload({ onUploadSuccess, userId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      setProgress('Parsing data...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setProgress('Upload complete!');
      onUploadSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      console.error('Upload error:', err);
      setToastMessage(err.message || 'Failed to upload file');
      setShowToast(true);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(''), 2000);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      await handleFileUpload(acceptedFiles[0]);
    },
    [userId, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-300 shadow-soft
          ${isDragActive
            ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-medium'
            : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="inline-block p-4 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl">
            <svg
              className="mx-auto h-12 w-12 text-primary-600"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {uploading ? (
            <div>
              <p className="text-lg font-semibold text-neutral-900">{progress}</p>
              <div className="mt-3 w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          ) : (
            <>
              <div>
                {isDragActive ? (
                  <div>
                    <p className="text-xl font-bold text-primary-700">
                      Drop the file here
                    </p>
                    <p className="text-sm text-neutral-600 mt-2">
                      Release to upload
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-neutral-900">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-neutral-600 mt-1">
                      or <span className="text-primary-600 font-medium">click to browse</span>
                    </p>
                    <div className="mt-4 space-y-1">
                      <p className="text-sm text-neutral-600">
                        Supported formats: <span className="font-medium text-neutral-900">CSV, TSV, Excel (.xlsx, .xls), JSON</span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Maximum file size: 50MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-accent-coral-50 border border-red-300 rounded-xl shadow-soft">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Sample Datasets */}
      <SampleDatasets onLoad={handleFileUpload} userId={userId} />

      {showToast && (
        <Toast
          message={toastMessage}
          type="error"
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
