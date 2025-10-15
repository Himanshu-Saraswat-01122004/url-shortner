import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ExternalLink, Copy, Trash2, BarChart3, Calendar, MousePointer } from 'lucide-react';
import { utils } from '../services/api';

const UrlCard = ({ url, onCopy, onDelete, loading, showAnalytics = false }) => {
  const shortCode = url.shortCode || url.shortUrl?.split('/').pop();
  const domain = utils.getDomain(url.longUrl);
  const createdDate = url.createdAt ? utils.formatDate(url.createdAt) : 'Recently';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* URLs */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <a
                href={url.longUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-900 hover:text-primary-600 truncate"
                title={url.longUrl}
              >
                {domain}
              </a>
            </div>
            
            <div className="flex items-center space-x-2">
              <Copy className="h-4 w-4 text-primary-500 flex-shrink-0" />
              <button
                onClick={() => onCopy(url.shortUrl)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 truncate"
                title="Click to copy"
              >
                {url.shortUrl}
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{createdDate}</span>
            </div>
            {showAnalytics && typeof url.clicks !== 'undefined' && (
              <div className="flex items-center space-x-1">
                <MousePointer className="h-3 w-3" />
                <span>{url.clicks} clicks</span>
              </div>
            )}
            {shortCode && (
              <div className="flex items-center space-x-1">
                <span>Code:</span>
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  {shortCode}
                </code>
              </div>
            )}
            {url.lastUpdated && (
              <div className="flex items-center space-x-1">
                <span className="text-green-600">Updated: {new Date(url.lastUpdated).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {shortCode && (
            <RouterLink
              to={`/url/${shortCode}`}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
              title="View Analytics"
            >
              <BarChart3 className="h-4 w-4" />
            </RouterLink>
          )}
          
          <button
            onClick={() => onCopy(url.shortUrl)}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Copy URL"
          >
            <Copy className="h-4 w-4" />
          </button>
          
          {shortCode && (
            <button
              onClick={() => onDelete(shortCode)}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              title="Delete URL"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Full URLs (expandable on mobile) */}
      <div className="mt-3 pt-3 border-t border-gray-100 sm:hidden">
        <div className="space-y-1 text-xs">
          <div className="text-gray-500">Original:</div>
          <div className="text-gray-900 break-all">{url.longUrl}</div>
          <div className="text-gray-500 mt-2">Short:</div>
          <div className="text-primary-600 break-all">{url.shortUrl}</div>
        </div>
      </div>
    </div>
  );
};

export default UrlCard;
