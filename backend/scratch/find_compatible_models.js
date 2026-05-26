const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const models = response.data.models;
    const compatible = models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
    console.log("Compatible Models for generateContent:");
    compatible.forEach(m => console.log(`- ${m.name}`));
  } catch (error) {
    console.error(`FAILED to list models. Error: ${error.message}`);
  }
}

listModels();
