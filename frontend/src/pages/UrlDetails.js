import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  BarChart3, 
  Calendar,
  Globe,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analyticsService, urlService, utils } from '../services/api';

const UrlDetails = () => {
  const { shortCode } = useParams();
  const [urlData, setUrlData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch URL details and analytics in parallel
      const [urlResponse, analyticsResponse] = await Promise.allSettled([
        urlService.getUrlDetails(shortCode),
        analyticsService.getUrlAnalytics(shortCode, { limit: 50 })
      ]);

      if (urlResponse.status === 'fulfilled') {
        setUrlData(urlResponse.value);
      } else {
        console.error('URL fetch error:', urlResponse.reason);
      }

      if (analyticsResponse.status === 'fulfilled') {
        setAnalytics(analyticsResponse.value);
      } else {
        console.error('Analytics fetch error:', analyticsResponse.reason);
        // Don't set error for analytics failure, just show empty state
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load URL details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shortCode) {
      fetchData();
    }
  }, [shortCode]);

  const handleCopyUrl = async () => {
    const shortUrl = `http://localhost:8091/${shortCode}`;
    const success = await utils.copyToClipboard(shortUrl);
    if (success) {
      toast.success('URL copied to clipboard!');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading URL details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <RouterLink to="/dashboard" className="btn btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </RouterLink>
        </div>
      </div>
    );
  }

  const shortUrl = `http://localhost:8091/${shortCode}`;
  const totalClicks = analytics?.totalClicks || 0;
  const recentClicks = analytics?.clicks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <RouterLink
          to="/dashboard"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="h-5 w-5" />
        </RouterLink>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">URL Details</h1>
          <p className="text-gray-600 mt-1">Analytics and information for {shortCode}</p>
        </div>
      </div>

      {/* URL Info Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 mb-4">URL Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Short URL
                </label>
                <div className="flex items-center space-x-2">
                  <code className="bg-gray-100 px-3 py-2 rounded-md text-sm font-mono flex-1">
                    {shortUrl}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="btn btn-outline flex items-center space-x-1"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {urlData && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Original URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <a
                      href={urlData.longUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 flex-1 truncate"
                    >
                      {urlData.longUrl}
                    </a>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Short Code
                  </label>
                  <code className="bg-gray-100 px-3 py-2 rounded-md text-sm font-mono block">
                    {shortCode}
                  </code>
                </div>
                
                {urlData?.longUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Domain
                    </label>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {utils.getDomain(urlData.longUrl)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Clicks
                </dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {totalClicks.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Recent Clicks
                </dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {recentClicks.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <RefreshCw className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Last Updated
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  {recentClicks.length > 0 
                    ? utils.formatDate(recentClicks[0].timestamp)
                    : 'No clicks yet'
                  }
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Clicks */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Clicks</h3>
          <button
            onClick={fetchData}
            className="btn btn-outline btn-sm flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="overflow-hidden">
          {recentClicks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentClicks.map((click, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {utils.formatDate(click.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {click.ipAddress || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {click.userAgent || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {click.referer ? (
                          <a
                            href={click.referer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {utils.getDomain(click.referer)}
                          </a>
                        ) : (
                          'Direct'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No clicks yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Share your short URL to start seeing click analytics here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UrlDetails;
