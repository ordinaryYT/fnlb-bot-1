const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN; // API token from .env
const ALLOWED_CATEGORIES = process.env.ALLOWED_CATEGORIES ? process.env.ALLOWED_CATEGORIES.split(',') : []; // Comma-separated category IDs

// In-memory storage for user categories and bots (replace with a database in production)
const userCategories = new Map();
const userBots = new Map();

app.get('/api/categories', async (req, res) => {
    try {
        const apiKey = `Bearer ${API_TOKEN}`; // Placeholder; replace with token exchange logic
        const response = await axios.get('https://api.fnlb.net/categories', {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const categories = response.data.filter(category => ALLOWED_CATEGORIES.includes(category.id));
        res.json({ success: true, categories });
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

app.post('/api/register-bot', async (req, res) => {
    const { authCode, altAccount, botName, categoryId } = req.body;

    if (!authCode || !altAccount || !botName || !categoryId) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const apiKey = `Bearer ${API_TOKEN}`; // Placeholder; replace with token exchange logic
        const botsResponse = await axios.get('https://api.fnlb.net/bots', {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const bots = botsResponse.data;
        const bot = bots.find(b => b.nickname === botName);

        if (bot) {
            // Simulate adding bot to category (future AHK integration)
            if (!userBots.has(altAccount)) userBots.set(altAccount, new Map());
            userBots.get(altAccount).set(botName, { categoryId, ...bot });

            res.json({
                success: true,
                bot: {
                    nickname: bot.nickname,
                    email: bot.email,
                    altAccount,
                    categoryId
                }
            });
        } else {
            res.status(404).json({ error: 'Bot not found with the given nickname.' });
        }
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to register bot.' });
    }
});

app.get('/api/category-settings', async (req, res) => {
    const { categoryId } = req.query;
    try {
        const apiKey = `Bearer ${API_TOKEN}`; // Placeholder; replace with token exchange logic
        const response = await axios.get('https://api.fnlb.net/categories', {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const category = response.data.find(c => c.id === categoryId);
        if (category) {
            res.json({ success: true, category });
        } else {
            res.status(404).json({ error: 'Category not found.' });
        }
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch category settings.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-GB', { timeZone: 'GMT' })}`);
});
