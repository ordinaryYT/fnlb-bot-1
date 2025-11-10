const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN; // Raw API key from .env (no Bearer prefix)
const ALLOWED_CATEGORIES = process.env.ALLOWED_CATEGORIES ? process.env.ALLOWED_CATEGORIES.split(',') : []; // Comma-separated category IDs

// In-memory storage for user categories and bots (replace with a database in production)
const userCategories = new Map();
const userBots = new Map();

// Helper: Fetch with retry for rate limits (from FNLB docs)
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, options);
      return res;
    } catch (error) {
      if (error.response?.status !== 429) throw error; // Only retry on 429

      const retryAfter = error.response.headers['retry-after'] || 10;
      const waitTime = parseInt(retryAfter) * 1000;
      console.log(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Rate limit exceeded after multiple retries.');
}

// New endpoint: Get public bots (filter by prefix for category 67c2fd571906bd75e5239684)
app.get('/api/public-bots', async (req, res) => {
  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Server config error: API_TOKEN not set.' });
  }

  try {
    const response = await fetchWithRetry('https://api.fnlb.net/bots', {
      headers: {
        'Authorization': API_TOKEN,  // Plain key, as per docs
        'Content-Type': 'application/json'
      }
    });

    const allBots = response.data;
    // Filter bots starting with "OGsbot" (for public category 67c2fd571906bd75e5239684)
    const publicBots = allBots.filter(bot => bot.nickname.toLowerCase().startsWith('ogsboti'));
    res.json({ success: true, bots: publicBots });
  } catch (error) {
    console.error('Public Bots API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch public bots. Check console for details.' 
    });
  }
});

app.get('/api/categories', async (req, res) => {
  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Server config error: API_TOKEN not set.' });
  }

  try {
    const response = await fetchWithRetry('https://api.fnlb.net/categories', {
      headers: {
        'Authorization': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const categories = response.data.filter(category => ALLOWED_CATEGORIES.includes(category.id));
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Categories API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch categories. Check console for details. Common fix: Verify API key format.' 
    });
  }
});

app.post('/api/register-bot', async (req, res) => {
  const { authCode, altAccount, botName, categoryId } = req.body;

  if (!authCode || !altAccount || !botName || !categoryId) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Server config error: API_TOKEN not set.' });
  }

  try {
    const botsResponse = await fetchWithRetry('https://api.fnlb.net/bots', {
      headers: {
        'Authorization': API_TOKEN,
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
    console.error('Register Bot API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to register bot. Check console for details.' 
    });
  }
});

app.get('/api/category-settings', async (req, res) => {
  const { categoryId } = req.query;
  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId query parameter is required.' });
  }

  if (!API_TOKEN) {
    return res.status(500).json({ error: 'Server config error: API_TOKEN not set.' });
  }

  try {
    const response = await fetchWithRetry('https://api.fnlb.net/categories', {
      headers: {
        'Authorization': API_TOKEN,
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
    console.error('Category Settings API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch category settings. Check console for details.' 
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} at ${new Date().toLocaleString('en-GB', { timeZone: 'GMT' })}`);
});
