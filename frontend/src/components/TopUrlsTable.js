import React from 'react';
import { ExternalLink, Copy, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { utils } from '../services/api';

const TopUrlsTable = ({ urls }) => {
  const handleCopyUrl = async (shortCode) => {
    const shortUrl = `http://localhost:8091/${shortCode}`;
    const success = await utils.copyToClipboard(shortUrl);
    if (success) {
      toast.success('URL copied to clipboard!');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Top Performing URLs</h3>
        <p className="text-sm text-gray-500 mt-1">
          Your most clicked short URLs
        </p>
      </div>
      
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {urls.slice(0, 10).map((url, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ExternalLink className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={url.longUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-900 hover:text-primary-600 truncate block"
                          title={url.longUrl}
                        >
                          {utils.getDomain(url.longUrl)}
                        </a>
                        <p className="text-xs text-gray-500 truncate" title={url.longUrl}>
                          {url.longUrl}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {url.shortCode}
                    </code>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 text-primary-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {parseInt(url.clickCount).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/url/${url.shortCode}`}
                        className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
                        title="View Details"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      
                      <button
                        onClick={() => handleCopyUrl(url.shortCode)}
                        className="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-green-50"
                        title="Copy Short URL"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {urls.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No data available</p>
          </div>
        )}
        
        {urls.length > 10 && (
          <div className="bg-gray-50 px-6 py-3 text-center">
            <p className="text-sm text-gray-500">
              Showing top 10 of {urls.length} URLs
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopUrlsTable;
