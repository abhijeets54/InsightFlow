'use client';

import { useState } from 'react';
import Card from './Card';
import Toast from './Toast';

interface ShareButtonProps {
  datasetId: string;
  userId: string;
  datasetName: string;
}

export default function ShareButton({ datasetId, userId, datasetName }: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [title, setTitle] = useState(datasetName);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleCreateShare = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId,
          userId,
          title,
          description,
          password: password || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setShareData(data.share);
    } catch (error: any) {
      setToastMessage(error.message || 'Failed to create share link');
      setToastType('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareData?.url) {
      navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setShareData(null);
    setTitle(datasetName);
    setDescription('');
    setPassword('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all duration-200 shadow-medium hover:shadow-large font-semibold flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-neutral-900">
                    Share Dashboard
                  </h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    Create a public link to share your data insights
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!shareData ? (
                <>
                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Sales Dashboard 2024"
                        className="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-forest-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Description <span className="text-neutral-500 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add context about this dashboard..."
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-forest-500 focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Password Protection <span className="text-neutral-500 font-normal">(optional)</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave empty for public access"
                        className="w-full px-4 py-2 border-2 border-neutral-300 rounded-lg focus:border-forest-500 focus:outline-none transition-colors"
                      />
                      <p className="text-xs text-neutral-600 mt-1">
                        Add a password to restrict access to this dashboard
                      </p>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="mt-6 p-3 bg-jasmine-50 border border-jasmine-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-neutral-700 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-neutral-700">
                        Anyone with the link can view this dashboard. You can deactivate the link anytime.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateShare}
                      disabled={loading || !title}
                      className="flex-1 px-4 py-2 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Creating...
                        </>
                      ) : (
                        'Create Link'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <div className="text-center py-4">
                    <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-forest-100 rounded-full mb-4">
                      <svg className="w-12 h-12 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">
                      Share Link Created!
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Your dashboard is now accessible via this link
                    </p>
                  </div>

                  {/* Share URL */}
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-neutral-900 mb-2">
                      Share URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareData.url}
                        readOnly
                        className="flex-1 px-4 py-2 border-2 border-neutral-300 rounded-lg bg-neutral-50 text-neutral-700 font-mono text-sm"
                      />
                      <button
                        onClick={handleCopy}
                        className="px-4 py-2 bg-forest-500 text-white rounded-lg hover:bg-forest-600 transition-all font-semibold flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Share Details */}
                  <div className="mt-4 p-4 bg-neutral-50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Title:</span>
                      <span className="font-semibold text-neutral-900">{shareData.title}</span>
                    </div>
                    {shareData.description && (
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Description:</span>
                        <span className="font-semibold text-neutral-900">{shareData.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Password Protected:</span>
                      <span className="font-semibold text-neutral-900">{shareData.hasPassword ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="mt-6">
                    <button
                      onClick={handleClose}
                      className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-all font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
}
