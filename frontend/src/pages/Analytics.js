import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Link, Users, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { analyticsService, serviceHealth } from '../services/api';
import AnalyticsChart from '../components/AnalyticsChart';
import TopUrlsTable from '../components/TopUrlsTable';
import ServiceStatus from '../components/ServiceStatus';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [showServiceStatus, setShowServiceStatus] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Check if analytics service is available
      const isAvailable = await analyticsService.isAvailable();
      setServiceAvailable(isAvailable);
      
      if (!isAvailable) {
        toast.error('Analytics service is not available. Please start the analytics service on port 8082.');
        setAnalytics({
          summary: { totalClicks: 0, uniqueUrls: 0, period: { startDate: null, endDate: null } },
          topUrls: []
        });
        return;
      }
      
      const params = {};
      
      if (dateRange.startDate) {
        params.startDate = new Date(dateRange.startDate).toISOString();
      }
      if (dateRange.endDate) {
        params.endDate = new Date(dateRange.endDate).toISOString();
      }

      const data = await analyticsService.getOverallAnalytics(params);
      setAnalytics(data);
      setServiceAvailable(true);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setServiceAvailable(false);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        toast.error('Analytics service is not running. Please start the analytics service on port 8082.');
      } else {
        toast.error('Failed to load analytics data: ' + (error.message || 'Unknown error'));
      }
      
      // Set empty analytics data
      setAnalytics({
        summary: { totalClicks: 0, uniqueUrls: 0, period: { startDate: null, endDate: null } },
        topUrls: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const applyDateFilter = () => {
    fetchAnalytics();
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setTimeout(fetchAnalytics, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Track your URL performance and usage statistics
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowServiceStatus(true)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Check Services</span>
          </button>
          <button
            onClick={fetchAnalytics}
            className="btn btn-outline flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="input w-full sm:w-auto"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              min={dateRange.startDate}
              className="input w-full sm:w-auto"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={applyDateFilter}
              className="btn btn-primary"
            >
              Apply Filter
            </button>
            <button
              onClick={clearDateFilter}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    {analytics.summary?.totalClicks?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Unique URLs
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {analytics.summary?.uniqueUrls?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. Clicks/URL
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {analytics.summary?.uniqueUrls > 0 
                      ? Math.round((analytics.summary.totalClicks / analytics.summary.uniqueUrls) * 10) / 10
                      : 0
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Period
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {analytics.summary?.period?.startDate && analytics.summary?.period?.endDate
                      ? `${new Date(analytics.summary.period.startDate).toLocaleDateString()} - ${new Date(analytics.summary.period.endDate).toLocaleDateString()}`
                      : 'All Time'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {analytics && analytics.topUrls && analytics.topUrls.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChart data={analytics.topUrls} />
          <TopUrlsTable urls={analytics.topUrls} />
        </div>
      )}

      {/* Service Unavailable Warning */}
      {!serviceAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Analytics Service Unavailable
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The analytics service is not running. To view analytics data:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Make sure the analytics service is running on port 8082</li>
                  <li>Check that PostgreSQL and RabbitMQ are running</li>
                  <li>Refresh this page once services are available</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {analytics && serviceAvailable && (!analytics.topUrls || analytics.topUrls.length === 0) && (
        <div className="bg-white rounded-lg shadow">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No analytics data available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create some short URLs and get clicks to see analytics data here.
            </p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Understanding Your Analytics
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Total Clicks:</strong> Number of times your short URLs were accessed</li>
                <li><strong>Unique URLs:</strong> Number of different short URLs you've created</li>
                <li><strong>Avg. Clicks/URL:</strong> Average number of clicks per URL</li>
                <li>Use date filters to analyze specific time periods</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status Modal */}
      {showServiceStatus && (
        <ServiceStatus onClose={() => setShowServiceStatus(false)} />
      )}
    </div>
  );
};

export default Analytics;
