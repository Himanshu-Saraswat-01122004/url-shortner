// analytics-service/index.js
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const amqp = require('amqplib');

// --- Database Setup (Sequelize ORM) ---
const sequelize = new Sequelize('analytics_db', 'user', 'password', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false,
});

const Click = sequelize.define('Click', {
    shortCode: { type: DataTypes.STRING, allowNull: false },
    timestamp: { type: DataTypes.DATE, allowNull: false },
    ipAddress: { type: DataTypes.STRING },
    userAgent: { type: DataTypes.STRING },
}, { timestamps: false });


// --- RabbitMQ Consumer ---
const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'q.click-events';

async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        
        console.log('Analytics consumer is waiting for messages.');

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    console.log(`Received click event for: ${event.shortCode}`);
                    await Click.create(event); // Save to PostgreSQL
                    channel.ack(msg); // Acknowledge the message
                } catch (error) {
                    console.error('Error processing message:', error);
                    channel.nack(msg, false, false); // Negative acknowledgement
                }
            }
        });
    } catch (error) {
        console.error('Failed to start RabbitMQ consumer', error);
    }
}


// --- API Setup (Express) ---
const app = express();
const PORT = 8082;

app.get('/api/v1/analytics/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    try {
        const { count } = await Click.findAndCountAll({
            where: { shortCode: shortCode },
        });
        res.json({ shortCode, clicks: count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});


// --- Start Application ---
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to PostgreSQL');
        await sequelize.sync(); // Sync models with DB
        
        startConsumer(); // Start listening for click events
        
        app.listen(PORT, () => {
            console.log(`Analytics-Service is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start the service:', error);
        process.exit(1);
    }
};

startServer();