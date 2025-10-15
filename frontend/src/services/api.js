import axios from 'axios';

// API base URLs
const URL_SERVICE_BASE = 'http://localhost:8080/api/v1';
const ANALYTICS_SERVICE_BASE = 'http://localhost:8082/api/v1';

// Health check base URLs (without /api/v1 path)
const URL_SERVICE_HEALTH_BASE = 'http://localhost:8080';
const ANALYTICS_SERVICE_HEALTH_BASE = 'http://localhost:8082';

// Create axios instances
const urlApi = axios.create({
  baseURL: URL_SERVICE_BASE,
  timeout: 10000,
});

const analyticsApi = axios.create({
  baseURL: ANALYTICS_SERVICE_BASE,
  timeout: 10000,
});

// Health check axios instances
const urlHealthApi = axios.create({
  baseURL: URL_SERVICE_HEALTH_BASE,
  timeout: 5000,
});

const analyticsHealthApi = axios.create({
  baseURL: ANALYTICS_SERVICE_HEALTH_BASE,
  timeout: 5000,
});

// Request interceptors for error handling
urlApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('URL Service Error:', error);
    return Promise.reject(error);
  }
);

analyticsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Analytics Service Error:', error);
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      error.message = 'Analytics service is not available. Please make sure the analytics service is running on port 8082.';
    }
    return Promise.reject(error);
  }
);

// URL Service APIs
export const urlService = {
  // Create short URL
  createShortUrl: async (longUrl, customCode = '') => {
    const payload = { longUrl };
    if (customCode.trim()) {
      payload.customCode = customCode.trim();
    }
    const response = await urlApi.post('/url', payload);
    return response.data;
  },

  // Get URL details
  getUrlDetails: async (shortCode) => {
    const response = await urlApi.get(`/url/${shortCode}`);
    return response.data;
  },

  // Delete URL
  deleteUrl: async (shortCode) => {
    const response = await urlApi.delete(`/url/${shortCode}`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await urlHealthApi.get('/health');
    return response.data;
  },
};

// Analytics Service APIs
export const analyticsService = {
  // Get analytics for specific URL
  getUrlAnalytics: async (shortCode, params = {}) => {
    try {
      const response = await analyticsApi.get(`/analytics/${shortCode}`, { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Return empty data for non-existent URLs
        return {
          shortCode,
          totalClicks: 0,
          clicks: [],
          pagination: { limit: 100, offset: 0, total: 0, hasMore: false }
        };
      }
      throw error;
    }
  },

  // Get overall analytics
  getOverallAnalytics: async (params = {}) => {
    try {
      const response = await analyticsApi.get('/analytics', { params });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        // Return empty analytics if service is down
        return {
          summary: {
            totalClicks: 0,
            uniqueUrls: 0,
            period: { startDate: null, endDate: null }
          },
          topUrls: [],
          pagination: { limit: 100, offset: 0, hasMore: false }
        };
      }
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await analyticsHealthApi.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },

  // Check if analytics service is available
  isAvailable: async () => {
    try {
      await analyticsService.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  },
};

// Service health checker
export const serviceHealth = {
  checkAll: async () => {
    const results = {};
    
    try {
      results.urlService = await urlService.healthCheck();
    } catch (error) {
      results.urlService = { status: 'unhealthy', error: error.message };
    }
    
    try {
      results.analyticsService = await analyticsService.healthCheck();
    } catch (error) {
      results.analyticsService = { status: 'unhealthy', error: error.message };
    }
    
    return results;
  }
};

// Utility functions
export const utils = {
  // Validate URL
  isValidUrl: (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  },

  // Format date
  formatDate: (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Copy to clipboard
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy: ', err);
      return false;
    }
  },

  // Get domain from URL
  getDomain: (url) => {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return url;
    }
  },
};
