// Import required libraries
const axios = require('axios');             // For making HTTP requests to fetch website content
const cheerio = require('cheerio');         // For parsing and scraping HTML
const { client } = require('../config/db.js'); // PostgreSQL client for database queries

// Load environment variables (e.g., API keys) from .env file
require('dotenv').config();

// Google Gemini AI API setup
const API_KEY = process.env.OPENAI_API_KEY || ""; 
// If .env doesn't contain a key, it will fall back to an empty string (meaning AI won't run)
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;


// ---------------------- CONTROLLER FUNCTIONS ----------------------

// 1. Analyze Website (Scrape + AI Enhancement + Store in DB)
async function analyzeWebsite(req, res) {
  const { url } = req.body; // Extract URL from request body

  // --- Step 1: Validate the URL ---
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  // Simple regex to check if the URL format is valid
  const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
  if (!urlRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  try {
    // --- Step 2: Scrape the website content ---
    const response = await axios.get(url, { timeout: 5000 }); // timeout = 5s
    const $ = cheerio.load(response.data); // Load HTML into Cheerio

    // Extract website title (brand name) and description (if available)
    let brandName = $('title').text() 
      || $('meta[property="og:site_name"]').attr('content') 
      || 'Not found';

    let description = $('meta[name="description"]').attr('content') 
      || $('p').first().text().substring(0, 255) // fallback: first paragraph
      || 'Not found';

    // --- Step 3: (Optional Bonus) Enhance description with AI ---
    if (description !== 'Not found' && API_KEY) { 
      try {
        // Create a prompt asking Gemini to rewrite the description
        const prompt = `Rewrite and enhance the following website description to be more concise, engaging, and suitable for a short summary. Keep it under 150 characters if possible.
        Original description: "${description}"`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,       // Higher = more creativity, lower = more factual
            maxOutputTokens: 100    // Restrict output length
          }
        };

        // Call Google Gemini API
        const aiResponse = await axios.post(API_URL, payload, {
          headers: { 'Content-Type': 'application/json' }
        });

        // Parse AI response and update description if successful
        if (aiResponse.data.candidates && aiResponse.data.candidates.length > 0 &&
            aiResponse.data.candidates[0].content?.parts?.length > 0) {
          description = aiResponse.data.candidates[0].content.parts[0].text.trim();
          console.log('Description enhanced by AI:', description);
        } else {
          console.warn('AI response unexpected:', aiResponse.data);
        }
      } catch (aiError) {
        console.error('Error enhancing description with AI:', aiError.message);
        // If AI fails, fallback to the original description
      }
    }

    // --- Step 4: Save results into PostgreSQL database ---
    const query = `
      INSERT INTO websites (brand_name, description)
      VALUES ($1, $2)
      RETURNING id, brand_name, description, timestamp;
    `;
    const values = [brandName, description];

    const result = await client.query(query, values); // Run query
    const newRecord = result.rows[0]; // Get the inserted row

    // Send back success response
    res.status(201).json({
      message: 'Website analysis successful and data stored.',
      data: newRecord
    });

  } catch (err) {
    console.error('Error analyzing website:', err.message);

    // Handle timeout errors separately
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Website analysis timed out. The server did not respond in time.' });
    }

    // Generic error fallback
    return res.status(500).json({ error: 'Failed to analyze website due to an internal server error.' });
  }
}


// 2. Get All Websites from DB
async function getAllWebsites(req, res) {
  try {
    const query = `
      SELECT id, brand_name, description, timestamp 
      FROM websites 
      ORDER BY timestamp DESC;
    `;
    const result = await client.query(query);

    res.status(200).json({
      message: 'Successfully retrieved all website records.',
      data: result.rows
    });

  } catch (err) {
    console.error('Error retrieving website records:', err.message);
    res.status(500).json({ error: 'Failed to retrieve website records.' });
  }
}


// 3. Update an Existing Website Record
async function updateWebsite(req, res) {
  const { id } = req.params; // Extract record ID from URL
  const { brand_name, description } = req.body; // Extract new values

  try {
    const query = `
      UPDATE websites
      SET brand_name = $1, description = $2
      WHERE id = $3
      RETURNING id, brand_name, description, timestamp;
    `;
    const values = [brand_name, description, id];
    const result = await client.query(query, values);

    // If no rows updated → record not found
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    res.status(200).json({
      message: 'Website record updated successfully.',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating website record:', err.message);
    res.status(500).json({ error: 'Failed to update website record.' });
  }
}


// 4. Delete a Website Record
async function deleteWebsite(req, res) {
  const { id } = req.params; // Extract record ID

  try {
    const query = `
      DELETE FROM websites
      WHERE id = $1
      RETURNING *;
    `;
    const result = await client.query(query, [id]);

    // If no rows deleted record not found
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    res.status(200).json({
      message: 'Website record deleted successfully.',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('Error deleting website record:', err.message);
    res.status(500).json({ error: 'Failed to delete website record.' });
  }
}


// Export controller functions so they can be used in routes
module.exports = {
  analyzeWebsite,
  getAllWebsites,
  updateWebsite,
  deleteWebsite
};
