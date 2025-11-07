// This is a one-time test script to find our correct Voice ID
require("dotenv").config();
const axios = require("axios");

// 1. Get the API key from our .env file
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICES_URL = "https://api.elevenlabs.io/v1/voices";

async function getVoices() {
  if (!API_KEY) {
    console.error("ERROR: ELEVENLABS_API_KEY is not set in your backend/.env file.");
    return;
  }

  console.log("Connecting to ElevenLabs to get your list of available voices...");

  try {
    // 2. Make an authenticated call to the "/v1/voices" endpoint
    const response = await axios.get(VOICES_URL, {
      headers: {
        "xi-api-key": API_KEY,
      },
    });

    // 3. Print the results
    const voices = response.data.voices;
    console.log("--- SUCCESS! Here is your list of available voices ---");
    
    // Loop and print each voice's name and ID
    voices.forEach(voice => {
      console.log(`- Name: ${voice.name}, Voice ID: ${voice.voice_id}`);
    });

    console.log("\n--- ACTION ---");
    console.log("Please copy the 'Voice ID' of a simple, pre-made voice (like 'Adam', 'Rachel', or 'Antoni').");
    console.log("We will use this ID in the next step to *permanently* fix our Cloudflare worker.");

  } catch (error) {
    console.error("--- ERROR ---");
    console.error("Failed to get voices. This probably means your API key in .env is incorrect or invalid.");
    console.error("Error details:", error.response.data);
  }
}

getVoices();