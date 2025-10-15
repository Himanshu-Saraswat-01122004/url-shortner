import React, { useState } from 'react';
import { Link, X, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { urlService, utils } from '../services/api';

const UrlShortener = ({ onUrlCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    longUrl: '',
    customCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Validate URL
    if (!formData.longUrl.trim()) {
      newErrors.longUrl = 'URL is required';
    } else if (!utils.isValidUrl(formData.longUrl)) {
      newErrors.longUrl = 'Please enter a valid URL (include http:// or https://)';
    }

    // Validate custom code (optional)
    if (formData.customCode.trim()) {
      const customCode = formData.customCode.trim();
      if (customCode.length < 3) {
        newErrors.customCode = 'Custom code must be at least 3 characters';
      } else if (customCode.length > 20) {
        newErrors.customCode = 'Custom code must be less than 20 characters';
      } else if (!/^[a-zA-Z0-9]+$/.test(customCode)) {
        newErrors.customCode = 'Custom code can only contain letters and numbers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const result = await urlService.createShortUrl(
        formData.longUrl,
        formData.customCode
      );
      
      onUrlCreated(result);
      
      // Reset form
      setFormData({ longUrl: '', customCode: '' });
      setErrors({});
    } catch (error) {
      console.error('Error creating short URL:', error);
      
      if (error.response?.status === 409) {
        setErrors({ customCode: 'This custom code is already taken' });
      } else if (error.response?.status === 400) {
        const errorMessage = error.response.data?.details?.[0] || 'Invalid input';
        toast.error(errorMessage);
      } else {
        toast.error('Failed to create short URL. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Create Short URL
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Long URL Input */}
          <div>
            <label htmlFor="longUrl" className="block text-sm font-medium text-gray-700">
              Original URL *
            </label>
            <div className="mt-1">
              <input
                type="url"
                id="longUrl"
                value={formData.longUrl}
                onChange={(e) => handleInputChange('longUrl', e.target.value)}
                placeholder="https://example.com/very-long-url"
                className={`input w-full ${errors.longUrl ? 'border-red-300' : ''}`}
                disabled={loading}
              />
              {errors.longUrl && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.longUrl}
                </div>
              )}
            </div>
          </div>

          {/* Custom Code Input */}
          <div>
            <label htmlFor="customCode" className="block text-sm font-medium text-gray-700">
              Custom Code (Optional)
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="customCode"
                value={formData.customCode}
                onChange={(e) => handleInputChange('customCode', e.target.value)}
                placeholder="my-custom-link"
                className={`input w-full ${errors.customCode ? 'border-red-300' : ''}`}
                disabled={loading}
              />
              {errors.customCode && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.customCode}
                </div>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Leave empty for auto-generated code. Only letters and numbers allowed.
              </p>
            </div>
          </div>

          {/* Preview */}
          {formData.longUrl && utils.isValidUrl(formData.longUrl) && (
            <div className="bg-gray-50 rounded-md p-3">
              <div className="text-sm text-gray-600">
                <strong>Original:</strong> {utils.getDomain(formData.longUrl)}
              </div>
              {formData.customCode && (
                <div className="text-sm text-gray-600 mt-1">
                  <strong>Short URL:</strong> localhost:8091/{formData.customCode}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center space-x-2"
              disabled={loading}
            >
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create Short URL'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UrlShortener;
