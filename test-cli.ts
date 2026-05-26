import { createJulesClient } from './src/renderer/lib/jules/client';

async function run() {
  // Use JULES_API_KEY from env, or a fallback if your environment injects it elsewhere
  const apiKey = process.env.JULES_API_KEY || "fallback-key";
  const client = createJulesClient(apiKey);
  
  console.log(`Testing JulesClient.listSources() using API Key: ${apiKey ? "***" + apiKey.slice(-4) : "None"}`);
  
  try {
    const sources = await client.listSources();
    console.log(`\nSuccess! Found ${sources.length} sources:`);
    sources.forEach(s => console.log(` - ${s.name} (ID: ${s.id})`));
  } catch (e) {
    console.error("\nFailed to fetch sources:");
    console.error(e);
  }
}

run();
