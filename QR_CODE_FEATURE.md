# QR Code Feature Documentation

## Overview
The URL Shortener now includes comprehensive QR code generation functionality with customization options, multiple formats, and download capabilities.

## Features

### 🎨 **Dynamic QR Code Generation**
- **Real-time generation** for any short URL
- **Multiple formats**: PNG and SVG
- **Customizable sizes**: 100px to 1000px
- **Error correction levels**: L (7%), M (15%), Q (25%), H (30%)

### 🎯 **Customization Options**
- **Colors**: Custom dark and light colors with hex color picker
- **Margins**: Adjustable margin (0-10 modules)
- **Size control**: Responsive size slider
- **Format selection**: PNG for printing, SVG for web

### 📥 **Download Functionality**
- **Direct download**: PNG and SVG formats
- **Data URL**: Copy QR code as base64 data URL
- **Filename**: Auto-generated with short code

### 📊 **Analytics Integration**
- **Generation tracking**: Logs QR code generation events
- **Format analytics**: Track which formats are most popular
- **Size preferences**: Monitor commonly used sizes

## API Endpoints

### 1. Get QR Code Data
```http
GET /api/v1/qr-data/:shortCode
```

**Query Parameters:**
- `size` (100-1000): QR code size in pixels (default: 200)
- `errorCorrectionLevel` (L|M|Q|H): Error correction level (default: M)
- `color[dark]` (#RRGGBB): Dark color (default: #000000)
- `color[light]` (#RRGGBB): Light color (default: #FFFFFF)
- `margin` (0-10): Margin in modules (default: 4)

**Response:**
```json
{
  "shortCode": "_1YStMo",
  "shortUrl": "http://localhost:8091/_1YStMo",
  "longUrl": "https://github.com/example/repo",
  "qrCode": {
    "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "size": 200,
    "format": "png",
    "errorCorrectionLevel": "M",
    "color": {
      "dark": "#000000",
      "light": "#FFFFFF"
    },
    "margin": 4
  },
  "downloadUrls": {
    "png": "/api/v1/qr/_1YStMo?size=200&format=png",
    "svg": "/api/v1/qr/_1YStMo?size=200&format=svg"
  }
}
```

### 2. Download QR Code
```http
GET /api/v1/qr/:shortCode
```

**Query Parameters:**
- `format` (png|svg): Output format (default: png)
- `size` (100-1000): QR code size (default: 200)
- `errorCorrectionLevel` (L|M|Q|H): Error correction (default: M)
- `color[dark]` (#RRGGBB): Dark color (default: #000000)
- `color[light]` (#RRGGBB): Light color (default: #FFFFFF)
- `margin` (0-10): Margin (default: 4)

**Response:**
- **PNG**: Binary PNG image data
- **SVG**: SVG XML markup

## Frontend Integration

### QR Code Button
Each URL card now includes a QR code button (purple icon) that opens the QR code generator modal.

### QR Code Generator Modal
- **Live preview** of QR code with current settings
- **Customization panel** with sliders and color pickers
- **Download buttons** for PNG and SVG formats
- **Copy data URL** functionality
- **Reset to defaults** option

### Usage in Components
```javascript
import QrCodeGenerator from '../components/QrCodeGenerator';

// In your component
const [showQrGenerator, setShowQrGenerator] = useState(false);
const [selectedShortCode, setSelectedShortCode] = useState(null);

const handleQrCode = (shortCode) => {
  setSelectedShortCode(shortCode);
  setShowQrGenerator(true);
};

// In JSX
{showQrGenerator && selectedShortCode && (
  <QrCodeGenerator
    shortCode={selectedShortCode}
    onClose={() => setShowQrGenerator(false)}
  />
)}
```

## Technical Implementation

### Backend Dependencies
- **qrcode**: QR code generation library
- **joi**: Input validation for customization options

### Frontend Dependencies
- **React hooks**: State management for modal and options
- **Lucide React**: Icons for UI elements
- **Tailwind CSS**: Styling and responsive design

### Validation Rules
- **Short codes**: Alphanumeric, underscore, hyphen (3-20 chars)
- **Colors**: Valid hex color format (#RRGGBB)
- **Sizes**: Integer between 100-1000 pixels
- **Error correction**: One of L, M, Q, H levels

## Error Handling

### API Errors
- **404**: Short URL not found
- **400**: Invalid parameters or validation errors
- **503**: Service unavailable (Redis connection issues)
- **500**: QR code generation failures

### Frontend Errors
- **Network errors**: Graceful fallback with error messages
- **Invalid inputs**: Real-time validation feedback
- **Download failures**: User-friendly error notifications

## Performance Considerations

### Caching
- QR codes are generated on-demand (no caching currently)
- Future enhancement: Redis caching for frequently accessed QR codes

### Size Limits
- Maximum size: 1000px (prevents excessive memory usage)
- Minimum size: 100px (ensures scannability)

### Rate Limiting
- QR code generation respects existing API rate limits
- Prevents abuse of resource-intensive operations

## Usage Examples

### Basic QR Code
```bash
curl "http://localhost:8080/api/v1/qr/abc123?format=png&size=200"
```

### Custom Styled QR Code
```bash
curl "http://localhost:8080/api/v1/qr/abc123?format=svg&size=300&errorCorrectionLevel=H&color[dark]=%23FF0000&color[light]=%23FFFF00"
```

### Get QR Code Data for Embedding
```bash
curl "http://localhost:8080/api/v1/qr-data/abc123?size=250&margin=2"
```

## Future Enhancements

### Planned Features
1. **Logo embedding**: Add custom logos to QR codes
2. **Batch generation**: Generate QR codes for multiple URLs
3. **Analytics tracking**: Track QR code scans and usage
4. **Templates**: Pre-defined styling templates
5. **Caching**: Redis-based QR code caching for performance

### Integration Ideas
1. **Email campaigns**: Embed QR codes in email templates
2. **Print materials**: High-resolution QR codes for posters/flyers
3. **Mobile apps**: QR code scanning functionality
4. **Social sharing**: Direct QR code sharing to social platforms

## Troubleshooting

### Common Issues
1. **QR code not generating**: Check if short URL exists
2. **Download not working**: Verify CORS settings and file permissions
3. **Invalid colors**: Ensure hex format (#RRGGBB)
4. **Size issues**: Keep within 100-1000px range

### Debug Commands
```bash
# Test QR code generation
curl -v "http://localhost:8080/api/v1/qr-data/YOUR_SHORT_CODE"

# Download QR code
curl "http://localhost:8080/api/v1/qr/YOUR_SHORT_CODE?format=png" -o test.png

# Check file type
file test.png
```

This QR code feature significantly enhances the URL shortener's functionality, making it more versatile for marketing, sharing, and offline-to-online bridging use cases.
