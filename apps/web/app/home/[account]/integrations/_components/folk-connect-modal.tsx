import React, { useState } from 'react';

import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Key,
  Mail,
  RefreshCw,
  X,
} from 'lucide-react';

interface FolkConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  existingConnection?: boolean; // Add this prop to handle updates
}

export function FolkConnectModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  existingConnection = false,
}: FolkConnectModalProps) {
  const [formData, setFormData] = useState({
    apiKey: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.apiKey.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Basic client-side validation
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/folk/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: formData.apiKey.trim(),
          email: formData.email.trim().toLowerCase(),
          accountId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const message = result.isUpdate
          ? 'Successfully updated Folk CRM connection!'
          : 'Successfully connected to Folk CRM!';
        setSuccess(message);

        setTimeout(() => {
          // Use the accountName from props instead of constructing URL in backend
          window.location.href = `/home/${accountName}/import/folk?connected=true&user_id=${result.userInfo.id}`;
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to connect to Folk CRM');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
      setError('');
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
              {existingConnection ? (
                <RefreshCw className="h-5 w-5 text-white" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-white"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M11.8 18h0.4c3.2 0 5.8-2.5 5.9-5.5 0-0.2-0.1-0.3-0.3-0.3H6.3c-0.2 0-0.3 0.1-0.3 0.3 0.1 3 2.6 5.5 5.8 5.5z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                {existingConnection ? 'Update' : 'Connect'} Folk CRM
              </h2>
              <p className="text-xs text-gray-500 sm:text-sm">
                {existingConnection
                  ? 'Update your connection'
                  : 'Sync your CRM data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Setup Instructions */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
            <h3 className="mb-3 flex items-center text-sm font-medium text-blue-900 sm:text-base">
              <Key className="mr-2 h-4 w-4" />
              Get your Folk API Key
            </h3>
            <ol className="space-y-2 text-xs text-blue-800 sm:text-sm">
              <li className="flex items-start">
                <span className="mr-2 min-w-[1rem] font-medium">1.</span>
                <span>
                  Visit{' '}
                  <a
                    href="https://app.folk.app/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center break-all text-blue-600 underline hover:text-blue-700"
                  >
                    Folk Settings
                    <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
                  </a>
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 min-w-[1rem] font-medium">2.</span>
                <span>
                  Navigate to the <strong>Integrations</strong> section
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 min-w-[1rem] font-medium">3.</span>
                <span>Generate or copy your API key</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 min-w-[1rem] font-medium">4.</span>
                <span>Enter it below with your Folk email</span>
              </li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="apiKey"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Folk API Key *
              </label>
              <div className="relative">
                <Key className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={handleInputChange('apiKey')}
                  placeholder="folk_api_..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  autoComplete="off"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Find this in Folk Settings → Integrations
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Your Folk Account Email *
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                  autoComplete="email"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                The email address for your Folk workspace
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start rounded-lg border border-green-200 bg-green-50 p-3">
                <CheckCircle className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 sm:text-base"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {existingConnection ? 'Updating...' : 'Connecting to Folk...'}
                </>
              ) : (
                `${existingConnection ? 'Update' : 'Connect'} Folk CRM`
              )}
            </button>
          </form>

          {/* Help Link */}
          <div className="mt-4 text-center">
            <a
              href="https://developer.folk.app/api-reference/authentication"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 sm:text-sm"
            >
              Need help? Check the Folk API Documentation
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
