import React, { useState, useEffect } from 'react';
import { Link, Copy, ExternalLink, Trash2, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { urlService, analyticsService, utils } from '../services/api';
import UrlShortener from '../components/UrlShortener';
import UrlCard from '../components/UrlCard';

const Dashboard = () => {
  const [urls, setUrls] = useState([]);
  const [urlsWithAnalytics, setUrlsWithAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showShortener, setShowShortener] = useState(false);

  // Load recent URLs from localStorage
  useEffect(() => {
    const savedUrls = localStorage.getItem('recentUrls');
    if (savedUrls) {
      try {
        const parsedUrls = JSON.parse(savedUrls);
        setUrls(parsedUrls);
        fetchAnalyticsForUrls(parsedUrls);
      } catch (error) {
        console.error('Error parsing saved URLs:', error);
      }
    }
  }, []);

  // Auto-refresh analytics every 30 seconds
  useEffect(() => {
    if (urls.length === 0) return;
    
    const interval = setInterval(() => {
      fetchAnalyticsForUrls(urls);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [urls]);

  // Fetch analytics data for URLs
  const fetchAnalyticsForUrls = async (urlList) => {
    if (!urlList || urlList.length === 0) {
      setUrlsWithAnalytics([]);
      return;
    }

    try {
      setAnalyticsLoading(true);
      const urlsWithClickData = await Promise.all(
        urlList.map(async (url) => {
          try {
            const shortCode = url.shortCode || url.shortUrl?.split('/').pop();
            if (!shortCode) return { ...url, clicks: 0 };
            
            const analytics = await analyticsService.getUrlAnalytics(shortCode);
            return {
              ...url,
              clicks: analytics.totalClicks || 0,
              lastUpdated: new Date().toISOString()
            };
          } catch (error) {
            // If analytics fails, return URL with 0 clicks
            return { ...url, clicks: 0 };
          }
        })
      );
      setUrlsWithAnalytics(urlsWithClickData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Fallback to URLs without analytics
      setUrlsWithAnalytics(urlList.map(url => ({ ...url, clicks: 0 })));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Refresh analytics data
  const refreshAnalytics = () => {
    fetchAnalyticsForUrls(urls);
    toast.success('Analytics refreshed!');
  };

  // Save URLs to localStorage
  const saveUrls = (newUrls) => {
    setUrls(newUrls);
    localStorage.setItem('recentUrls', JSON.stringify(newUrls));
  };

  const handleUrlCreated = (newUrl) => {
    const updatedUrls = [newUrl, ...urls.slice(0, 9)]; // Keep only 10 recent URLs
    saveUrls(updatedUrls);
    fetchAnalyticsForUrls(updatedUrls); // Refresh analytics
    setShowShortener(false);
    toast.success('Short URL created successfully!');
  };

  const handleCopyUrl = async (shortUrl) => {
    const success = await utils.copyToClipboard(shortUrl);
    if (success) {
      toast.success('URL copied to clipboard!');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const handleDeleteUrl = async (shortCode) => {
    try {
      setLoading(true);
      await urlService.deleteUrl(shortCode);
      const updatedUrls = urls.filter(url => !url.shortUrl.includes(shortCode));
      saveUrls(updatedUrls);
      fetchAnalyticsForUrls(updatedUrls); // Refresh analytics
      toast.success('URL deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete URL');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Create and manage your short URLs
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={refreshAnalytics}
            className="btn btn-outline flex items-center space-x-2"
            disabled={analyticsLoading}
          >
            <Copy className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
          <button
            onClick={() => setShowShortener(!showShortener)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Short URL</span>
          </button>
        </div>
      </div>

      {/* URL Shortener */}
      {showShortener && (
        <div className="animate-slide-up">
          <UrlShortener
            onUrlCreated={handleUrlCreated}
            onCancel={() => setShowShortener(false)}
          />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total URLs
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {urls.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Copy className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Clicks
                  {analyticsLoading && (
                    <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  )}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {analyticsLoading && urlsWithAnalytics.length === 0 ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    urlsWithAnalytics.reduce((total, url) => total + (url.clicks || 0), 0).toLocaleString()
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExternalLink className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Links
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {urls.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent URLs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent URLs
          </h3>
          
          {urls.length === 0 ? (
            <div className="text-center py-12">
              <Link className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No URLs created yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first short URL.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowShortener(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Short URL
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(urlsWithAnalytics.length > 0 ? urlsWithAnalytics : urls).map((url, index) => (
                <UrlCard
                  key={index}
                  url={url}
                  onCopy={handleCopyUrl}
                  onDelete={handleDeleteUrl}
                  loading={loading}
                  showAnalytics={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Getting Started
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Enter any valid URL to create a short link</li>
                <li>Optionally customize your short code</li>
                <li>Share your short URLs and track analytics</li>
                <li>Click counts update automatically every 30 seconds</li>
                <li>Use "Refresh Stats" to update immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
