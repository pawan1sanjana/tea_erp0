const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  console.log(`Listing available models...`);
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(`FAILED to list models. Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

listModels();
