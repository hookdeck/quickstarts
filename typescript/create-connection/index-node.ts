import 'dotenv/config'
import { HookdeckClient } from '@hookdeck/sdk';

const hookdeck = new HookdeckClient({
  token: process.env.HOOKDECK_API_KEY!
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

const connectionWithCliDestination = await hookdeck.connection.upsert({
  name: "inbound-example-with-cli",
  source: {
    name: connection.source.name,
  },
  destination: {
    name: "localhost",
    cliPath: "/webhooks/local"
  }
});

console.log("Created or updated Connection with CLI Destination. CLI Path:", connectionWithCliDestination.destination.cliPath);

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
