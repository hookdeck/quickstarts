import dotenv from "dotenv";
dotenv.config();

const getRequests = async () => {
  const response = await fetch("https://api.hookdeck.com/2024-09-01/requests", {
    headers: {
      Authorization: `Bearer ${process.env.HOOKDECK_API_KEY}`,
    },
  });

  return await response.json();
};

const getRequest = async (requestId: string) => {
  const response = await fetch(
    `https://api.hookdeck.com/2024-09-01/requests/${requestId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.HOOKDECK_API_KEY}`,
      },
    }
  );

  return await response.json();
};

const main = async () => {
  const requests = await getRequests();

  let iteration = 0;
  for (const request of requests.models) {
    ++iteration;
    const requestDetails = await getRequest(request.id);
    console.log(`Request ${iteration} of ${requests.count}`);
    console.log(requestDetails);
    console.log("Body", requestDetails.data.body);
    console.log("-----------------");
  }
};

main();
