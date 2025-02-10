import { load } from "https://deno.land/std@0.223.0/dotenv/mod.ts";
const env = await load();

const createHookdeckConnection = async (
  connectionConfig: ConnectionConfig
): Promise<ConnectionResponse> => {
  const response = await fetch(
    "https://api.hookdeck.com/2024-09-01/connections",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.HOOKDECK_API_KEY}`,
      },
      body: JSON.stringify(connectionConfig),
    }
  );

  return await response.json();
};

const connection = await createHookdeckConnection({
  name: "inbound-example",
  source: {
    name: "inbound",
  },
  destination: {
    name: "outbound",
    url: "https://mock.hookdeck.com",
  },
});

console.log(
  "Created or updated Connection. Source URL:",
  connection.source.url
);

const publishResult = await fetch(connection.source.url!, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: "Hello, World!",
  }),
});

console.log(
  "Sent request to Connection Source. Response:",
  await publishResult.json()
);
