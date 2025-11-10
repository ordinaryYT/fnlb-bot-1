const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN; // API token from .env

// In-memory storage for user categories (replace with a database in production)
const userCategories = new Map();

app.post('/api/register-bot', async (req, res) => {
    const { authCode, altAccount, botName } = req.body;

    if (!authCode || !altAccount || !botName) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Simulate token exchange (replace with actual Epic Games token exchange)
        const apiKey = `Bearer ${API_TOKEN}`; // Placeholder; replace with token exchange logic

        const response = await axios.get('https://api.fnlb.net/bots', {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const bots = response.data;
        const bot = bots.find(b => b.nickname === botName);

        if (bot) {
            // Generate a unique category name for the user (e.g., altAccount + timestamp)
            const categoryName = `${altAccount}_Cat_${Date.now()}`;
            userCategories.set(altAccount, categoryName);

            res.json({
                success: true,
                bot: {
                    nickname: bot.nickname,
                    email: bot.email,
                    altAccount,
                    category: categoryName
                }
            });
        } else {
            res.status(404).json({ error: 'Bot not found with the given nickname.' });
        }
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch bots. Please try again later.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-GB', { timeZone: 'GMT' })}`);
});
