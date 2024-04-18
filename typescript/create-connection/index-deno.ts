import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
const env = await load();
import { HookdeckClient } from '@hookdeck/sdk';

const hookdeck = new HookdeckClient({
  token: process.env.HOOKDECK_API_KEY
});

const connection = await hookdeck.connection.upsert({
  name: "inbound-example",
  source: {
    name: "inbound"
  },
  destination: {
    name: "outbound",
    url: "https://mock.hookdeck.com"
  }
});

console.log("Created or updated Connection. Source URL:", connection.source.url);

const publishResult = await fetch(connection.source.url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "Hello, World!"
  })
});

console.log("Sent request to Connection Source. Response:", await publishResult.json());
