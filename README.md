# URL Shortener

A microservices-based URL shortener application built with Node.js, featuring distributed architecture with Redis caching, PostgreSQL analytics, and RabbitMQ message queuing.

## 🏗️ Architecture

This application consists of three microservices:

- **URL Service** - Handles URL shortening and management
- **Redirect Service** - Manages URL redirections and click tracking
- **Analytics Service** - Processes and stores analytics data

## 🚀 Features

- **URL Shortening** - Generate short URLs using nanoid
- **Fast Redirects** - Redis-cached redirections for optimal performance
- **Analytics Tracking** - Track clicks and usage statistics
- **Microservices Architecture** - Scalable and maintainable design
- **Message Queue** - Asynchronous processing with RabbitMQ
- **Database Storage** - PostgreSQL for analytics data persistence

## 🛠️ Technology Stack

### Backend Services
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Redis** - Caching and session storage
- **PostgreSQL** - Analytics database
- **RabbitMQ** - Message broker
- **Sequelize** - ORM for PostgreSQL

### Infrastructure
- **Docker Compose** - Container orchestration
- **Docker** - Containerization

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Himanshu-Saraswat-01122004/url-shortner.git
cd url-shortner
```

### 2. Start Infrastructure Services

Start the required infrastructure services (PostgreSQL, Redis, RabbitMQ):

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port `5432`
- Redis on port `6379`
- RabbitMQ on port `5672` (Management UI on `15672`)

### 3. Install Dependencies

Install dependencies for each service:

```bash
# URL Service
cd url-service
npm install
cd ..

# Redirect Service
cd redirect-service
npm install
cd ..

# Analytics Service
cd analytics-service
npm install
cd ..
```

### 4. Start the Services

Start each service in separate terminals:

```bash
# Terminal 1 - URL Service
cd url-service
npm start

# Terminal 2 - Redirect Service
cd redirect-service
npm start

# Terminal 3 - Analytics Service
cd analytics-service
npm start
```

## 📁 Project Structure

```
url-shortner/
├── url-service/           # URL shortening service
│   ├── index.js          # Main service file
│   ├── package.json      # Dependencies and scripts
│   └── .gitignore        # Git ignore patterns
├── redirect-service/      # URL redirection service
│   ├── index.js          # Main service file
│   ├── package.json      # Dependencies and scripts
│   └── .gitignore        # Git ignore patterns
├── analytics-service/     # Analytics processing service
│   ├── index.js          # Main service file
│   ├── package.json      # Dependencies and scripts
│   └── .gitignore        # Git ignore patterns
├── docker-compose.yml     # Infrastructure services
└── README.md             # Project documentation
```

## 🔧 Configuration

### Environment Variables

Each service can be configured using environment variables:

#### URL Service
- `PORT` - Service port (default: 3001)
- `REDIS_URL` - Redis connection URL

#### Redirect Service
- `PORT` - Service port (default: 3002)
- `REDIS_URL` - Redis connection URL
- `RABBITMQ_URL` - RabbitMQ connection URL

#### Analytics Service
- `PORT` - Service port (default: 3003)
- `DATABASE_URL` - PostgreSQL connection URL
- `RABBITMQ_URL` - RabbitMQ connection URL

### Infrastructure Services

The `docker-compose.yml` configures:

- **PostgreSQL**: Database for analytics storage
  - User: `user`
  - Password: `password`
  - Database: `analytics_db`
  
- **Redis**: Caching layer for fast URL lookups
- **RabbitMQ**: Message queue for asynchronous processing
  - Management UI: http://localhost:15672 (guest/guest)

## 📊 API Endpoints

### URL Service
- `POST /shorten` - Create a short URL
- `GET /urls` - List all URLs
- `GET /urls/:id` - Get URL details

### Redirect Service
- `GET /:shortCode` - Redirect to original URL

### Analytics Service
- `GET /analytics` - Get analytics data
- `GET /analytics/:shortCode` - Get analytics for specific URL

## 🧪 Testing

Run tests for each service:

```bash
# URL Service
cd url-service
npm test

# Redirect Service
cd redirect-service
npm test

# Analytics Service
cd analytics-service
npm test
```

## 📈 Monitoring

- **RabbitMQ Management**: http://localhost:15672
- **Service Health**: Each service exposes health check endpoints
- **Logs**: Check Docker logs for infrastructure services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Himanshu Saraswat** - [GitHub](https://github.com/Himanshu-Saraswat-01122004)

## 🙏 Acknowledgments

- Built with modern Node.js microservices architecture
- Inspired by industry-standard URL shortening services
- Uses best practices for scalable web applications

---

For more information or support, please open an issue on GitHub.
