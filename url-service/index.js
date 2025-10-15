// url-service/index.js
const express = require('express');
const { createClient } = require('redis');
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());

const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.log('Redis Client Error', err));

const BASE_URL = 'http://localhost:8091/';
const PORT = 8080;

app.post('/api/v1/url', async (req, res) => {
    const { longUrl } = req.body;
    if (!longUrl) {
        return res.status(400).json({ error: 'longUrl is required' });
    }

    try {
        // Generate a unique short code
        let shortCode;
        do {
            shortCode = nanoid(7);
        } while (await redisClient.exists(shortCode));

        // Store the mapping in Redis
        await redisClient.set(shortCode, longUrl);
        res.status(201).json({ shortUrl: BASE_URL + shortCode });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

const startServer = async () => {
    await redisClient.connect();
    app.listen(PORT, () => {
        console.log(`URL-Service is running on port ${PORT}`);
    });
};

startServer();