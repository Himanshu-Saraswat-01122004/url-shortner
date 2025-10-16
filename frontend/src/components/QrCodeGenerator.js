import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Download, 
  Settings, 
  X, 
  Palette, 
  Maximize,
  AlertCircle,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import { urlService } from '../services/api';

const QrCodeGenerator = ({ shortCode, onClose }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const [options, setOptions] = useState({
    size: 200,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    margin: 4
  });

  useEffect(() => {
    generateQrCode();
  }, [shortCode, options]);

  const generateQrCode = async () => {
    try {
      setLoading(true);
      console.log('Generating QR code for shortCode:', shortCode);
      console.log('Options:', options);
      
      const data = await urlService.getQrCodeData(shortCode, options);
      console.log('QR code data received:', data);
      setQrData(data);
    } catch (error) {
      console.error('Error generating QR code:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        shortCode: shortCode,
        options: options
      });
      
      if (error.response?.status === 404) {
        toast.error(`Short URL '${shortCode}' not found`);
      } else if (error.response?.status === 400) {
        toast.error(`Invalid parameters: ${error.response.data?.details?.join(', ') || 'Check your input'}`);
      } else {
        toast.error(`Failed to generate QR code: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (key, value) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setOptions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const downloadQrCode = async (format) => {
    try {
      const downloadUrl = urlService.getQrCodeUrl(shortCode, { ...options, format });
      
      // Create a temporary link and click it to download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `qr-${shortCode}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`QR code downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const copyQrCodeUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrData?.qrCode?.dataUrl || '');
      toast.success('QR code data URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy QR code URL');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <QrCode className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">QR Code Generator</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-2 text-gray-600">Generating QR code...</span>
            </div>
          ) : qrData ? (
            <div className="space-y-6">
              {/* QR Code Display */}
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                  <img
                    src={qrData.qrCode.dataUrl}
                    alt={`QR Code for ${shortCode}`}
                    className="mx-auto"
                    style={{ width: options.size, height: options.size }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Short URL:</strong> {qrData.shortUrl}
                  </p>
                  <p className="text-xs text-gray-500 break-all">
                    <strong>Original:</strong> {qrData.longUrl}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => downloadQrCode('png')}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={() => downloadQrCode('svg')}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download SVG</span>
                </button>
                <button
                  onClick={copyQrCodeUrl}
                  className="btn btn-outline flex items-center space-x-2"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Copy Data URL</span>
                </button>
                <button
                  onClick={() => setShowCustomization(!showCustomization)}
                  className="btn btn-outline flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Customize</span>
                </button>
              </div>

              {/* Customization Panel */}
              {showCustomization && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    Customization Options
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Size (px)
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="500"
                        value={options.size}
                        onChange={(e) => handleOptionChange('size', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">{options.size}px</div>
                    </div>

                    {/* Error Correction Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Error Correction
                      </label>
                      <select
                        value={options.errorCorrectionLevel}
                        onChange={(e) => handleOptionChange('errorCorrectionLevel', e.target.value)}
                        className="input w-full"
                      >
                        <option value="L">Low (7%)</option>
                        <option value="M">Medium (15%)</option>
                        <option value="Q">Quartile (25%)</option>
                        <option value="H">High (30%)</option>
                      </select>
                    </div>

                    {/* Dark Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dark Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={options.color.dark}
                          onChange={(e) => handleOptionChange('color.dark', e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={options.color.dark}
                          onChange={(e) => handleOptionChange('color.dark', e.target.value)}
                          className="input flex-1"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {/* Light Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Light Color
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={options.color.light}
                          onChange={(e) => handleOptionChange('color.light', e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={options.color.light}
                          onChange={(e) => handleOptionChange('color.light', e.target.value)}
                          className="input flex-1"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>

                    {/* Margin */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Margin
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={options.margin}
                        onChange={(e) => handleOptionChange('margin', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">{options.margin} modules</div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setOptions({
                        size: 200,
                        errorCorrectionLevel: 'M',
                        color: { dark: '#000000', light: '#FFFFFF' },
                        margin: 4
                      })}
                      className="btn btn-secondary btn-sm"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              )}

              {/* Info Panel */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">
                      QR Code Information
                    </h4>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>QR codes can be scanned by any QR code reader</li>
                        <li>Higher error correction allows scanning even if partially damaged</li>
                        <li>PNG format is best for printing, SVG for web use</li>
                        <li>Recommended minimum size: 200px for mobile scanning</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Failed to Generate QR Code
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Please try again or check if the short URL exists.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrCodeGenerator;
