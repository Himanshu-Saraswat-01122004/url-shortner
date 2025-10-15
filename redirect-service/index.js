// redirect-service/index.js
const express = require('express');
const { createClient } = require('redis');
const amqp = require('amqplib');

const app = express();

// Redis setup
const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

// RabbitMQ setup
const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'q.click-events';
let channel, connection;

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ', error);
        process.exit(1); // Exit if we can't connect
    }
}

app.get('/health', (req, res) => {
    console.log('Health check');
    res.send('OK');
});

app.get('/:shortCode', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received request for: ${req.params.shortCode}`);
    const { shortCode } = req.params;
    try {
        const longUrl = await redisClient.get(shortCode);
        console.log(`Retrieved longUrl: ${longUrl}`);

        if (longUrl) {
            // Asynchronously publish a click event
            const event = {
                shortCode,
                timestamp: new Date().toISOString(),
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            };
            // Send to queue
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(event)), { persistent: true });

            // Perform redirect
            return res.redirect(302, longUrl);
        } else {
            return res.status(404).send('Not Found');
        }
    } catch (error) {
        console.error('!!! INTERNAL SERVER ERROR !!!', error);
        return res.status(500).send('Server Error');
    }
});

const startServer = async () => {
    await redisClient.connect();
    await connectRabbitMQ();
    const PORT = 8091;
    app.listen(PORT, () => {
        console.log(`Redirect-Service is running on port ${PORT}`);
    });
};

startServer();