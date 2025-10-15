# URL Shortener Frontend

A modern React-based web dashboard for the URL Shortener application.

## Features

- **URL Shortening Interface** - Create short URLs with optional custom codes
- **Analytics Dashboard** - View click statistics and performance metrics
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Real-time Updates** - Live data with refresh capabilities
- **Modern UI** - Built with Tailwind CSS and Lucide icons

## Tech Stack

- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Chart.js** - Interactive charts and graphs
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Elegant notifications

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- URL Shortener backend services running

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── public/                 # Static files
├── src/
│   ├── components/        # Reusable components
│   │   ├── Layout.js     # Main layout wrapper
│   │   ├── UrlShortener.js # URL creation form
│   │   ├── UrlCard.js    # URL display card
│   │   ├── AnalyticsChart.js # Chart component
│   │   └── TopUrlsTable.js # Analytics table
│   ├── pages/            # Page components
│   │   ├── Dashboard.js  # Main dashboard
│   │   ├── Analytics.js  # Analytics overview
│   │   └── UrlDetails.js # Individual URL stats
│   ├── services/         # API services
│   │   └── api.js       # API client and utilities
│   ├── App.js           # Main app component
│   ├── index.js         # App entry point
│   └── index.css        # Global styles
├── package.json
└── README.md
```

## API Integration

The frontend connects to the following backend services:

- **URL Service** (port 8080) - URL creation and management
- **Analytics Service** (port 8082) - Click tracking and statistics
- **Redirect Service** (port 8091) - URL redirection

## Features Overview

### Dashboard
- Create new short URLs
- View recent URLs
- Quick statistics
- URL management (copy, delete)

### Analytics
- Overall click statistics
- Top performing URLs
- Interactive charts
- Date range filtering

### URL Details
- Individual URL analytics
- Click history
- User agent and referer data
- Real-time updates

## Configuration

The app uses environment variables for configuration:

- `REACT_APP_API_URL` - Backend API base URL
- `REACT_APP_REDIRECT_URL` - Redirect service URL

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Styling

The app uses Tailwind CSS for styling. Custom styles are defined in:
- `src/index.css` - Global styles and Tailwind components
- `tailwind.config.js` - Tailwind configuration

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
