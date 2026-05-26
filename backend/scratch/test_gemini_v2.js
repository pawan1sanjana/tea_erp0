const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}...`);
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: 'Hello, are you working?' }] }]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log(`SUCCESS: ${modelName} responded.`);
    return true;
  } catch (error) {
    console.error(`FAILED: ${modelName}. Error: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  await testModel('gemini-flash-latest');
  await testModel('gemini-pro-latest');
  await testModel('gemini-1.5-flash');
}

runTests();
