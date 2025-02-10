import "dotenv/config";

const createHookdeckConnection = async (
  connectionConfig: ConnectionConfig
): Promise<ConnectionResponse> => {
  const response = await fetch(
    "https://api.hookdeck.com/2024-09-01/connections",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HOOKDECK_API_KEY}`,
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

const connectionWithCliDestination = await createHookdeckConnection({
  name: "inbound-example-with-cli",
  source: {
    name: connection.source.name,
  },
  destination: {
    name: "localhost",
    cli_path: "/webhooks/local",
  },
});

console.log(
  "Created or updated Connection with CLI Destination. CLI Path:",
  connectionWithCliDestination.destination.cli_path
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
