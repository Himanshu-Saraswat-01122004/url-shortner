import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { serviceHealth } from '../services/api';

const ServiceStatus = ({ onClose }) => {
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);

  const checkServices = async () => {
    try {
      setLoading(true);
      const health = await serviceHealth.checkAll();
      setServices(health);
    } catch (error) {
      console.error('Error checking services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkServices();
  }, []);

  const getStatusIcon = (service) => {
    if (!service) return <XCircle className="h-5 w-5 text-red-500" />;
    
    if (service.status === 'healthy') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (service) => {
    if (!service) return 'text-red-600';
    return service.status === 'healthy' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Service Status</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-primary-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600">Checking services...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(services.urlService)}
                  <div>
                    <p className="font-medium text-gray-900">URL Service</p>
                    <p className="text-sm text-gray-500">Port 8080</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(services.urlService)}`}>
                  {services.urlService?.status || 'Unavailable'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(services.analyticsService)}
                  <div>
                    <p className="font-medium text-gray-900">Analytics Service</p>
                    <p className="text-sm text-gray-500">Port 8082</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(services.analyticsService)}`}>
                  {services.analyticsService?.status || 'Unavailable'}
                </span>
              </div>

              {services.analyticsService?.status !== 'healthy' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">
                        Analytics Service Issue
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {services.analyticsService?.error || 'Service is not responding'}
                      </p>
                      <div className="mt-2 text-xs text-yellow-600">
                        <p>To fix this:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Start the analytics service: <code>cd analytics-service && node index.js</code></li>
                          <li>Ensure PostgreSQL is running</li>
                          <li>Ensure RabbitMQ is running</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={checkServices}
              className="btn btn-outline flex items-center space-x-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceStatus;
