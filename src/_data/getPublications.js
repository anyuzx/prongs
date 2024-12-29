const axios = require('axios');

// Set up headers with a clear and polite User-Agent
const headers = {
  'Accept': 'application/vnd.citationstyles.csl+json',
  'User-Agent': 'Prongs (personal website) (mailto:stefanshi1988@gmail.com)'
};

// Function to fetch bibliography data for a single DOI
async function getBib(doi, retries = 5) {
  const url = `https://doi.org/${encodeURIComponent(doi)}`;
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    // Handle 429 rate-limiting with an incremental backoff
    if (error.response && error.response.status === 429 && retries > 0) {
      const delay = (6 - retries) * 5000; 
      console.log(`Rate limited. Retrying ${doi} in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getBib(doi, retries - 1);
    } else {
      console.error(`Failed to fetch ${doi}:`, error.message);
      throw error;
    }
  }
}

// Import your DOI list
const doiList = require('../contents/publications/publication_doi.json');

// Helper to create small batches
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Main function to fetch data for all DOIs
module.exports = async function() {
  try {
    // Decide how many DOIs to fetch at once
    // A smaller batch size means fewer parallel requests, which reduces 429 errors
    const batchSize = 3;  // can tweak to 1, 2, 3, etc.

    const chunks = chunkArray(doiList, batchSize);
    const allResults = [];

    for (const [i, chunk] of chunks.entries()) {
      console.log(`\nFetching batch ${i + 1} of ${chunks.length}...`);

      // Approach A: Fetch each DOI in the chunk **sequentially** (safer)
      const chunkResults = [];
      for (const doi of chunk) {
        // Fetch one by one
        const result = await getBib(doi);
        chunkResults.push(result);

        // Optionally add a delay between requests (e.g. 1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // If you prefer small parallel fetches:
      /*
      const chunkResults = await Promise.all(chunk.map((doi) => getBib(doi)));
      */

      allResults.push(...chunkResults);

      // Optional small delay between batches (e.g. 2 seconds)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return allResults;
  } catch (error) {
    console.error('Error fetching publications:', error.message);
    throw error;
  }
};
