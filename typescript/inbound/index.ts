import express, { Request, Response, NextFunction, Application } from "express";

declare module 'express-serve-static-core' {
  interface Request {
    rawBody: string;
  }
}

import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const HOOKDECK_WEBHOOK_SECRET = process.env.HOOKDECK_WEBHOOK_SECRET;

const app: Application = express();

app.use(express.json({
  verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
    req.rawBody = buf.toString();
  }
}));

const verifyHookdeckSignature = async (req: Request, res: Response, next: NextFunction) => {
  if(!HOOKDECK_WEBHOOK_SECRET) {
    console.warn("No HOOKDECK_WEBHOOK_SECRET found in environment variables. Skipping verification.")
    next();
    return;
  }

  // Extract x-hookdeck-signature and x-hookdeck-signature-2 headers from the request
  const hmacHeader = req.get("x-hookdeck-signature");
  const hmacHeader2 = req.get("x-hookdeck-signature-2");

  // Create a hash based on the parsed body
  const hash = crypto
    .createHmac("sha256", HOOKDECK_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("base64");

  // Compare the created hash with the value of the x-hookdeck-signature 
  // and x-hookdeck-signature-2 headers
  const verified = (hash === hmacHeader || (hmacHeader2 && hash === hmacHeader2));

  if(verified) {
    next();
  }
  else {
    res.status(401).send("Unauthorized");
  }
}

const port = process.env.PORT || 3030;

app.post("*", verifyHookdeckSignature, (req: Request, res: Response) => {
  console.log({
    webhook_received: new Date().toISOString(), 
    path: req.path, 
    body: req.body
  });

  res.json({ status: "ACCEPTED" });
});

app.listen(port, () => {
  console.log(`🪝 Server running at http://localhost:${port}`);
});
