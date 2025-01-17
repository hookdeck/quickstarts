import express, { Request, Response, NextFunction, Application } from "express";

declare module 'express-serve-static-core' {
  interface Request {
    rawBody: string;
  }
}

import dotenv from "dotenv";
import { verifyWebhookSignature } from "@hookdeck/sdk/webhooks";
import multer from "multer";

dotenv.config();

const HOOKDECK_WEBHOOK_SECRET = process.env.HOOKDECK_WEBHOOK_SECRET;

const app: Application = express();

const verify = async (req: Request, res: Response, next: NextFunction) => {
  if(!HOOKDECK_WEBHOOK_SECRET) {
    console.warn("No HOOKDECK_WEBHOOK_SECRET found in environment variables. Skipping verification.")
    next();
    return;
  }

  const verified = await verifyWebhookSignature({
    headers: req.headers as { [key: string]: string; },
    rawBody: req.rawBody,
    signingSecret: HOOKDECK_WEBHOOK_SECRET
  });

  if(verified) {
    next();
  }
  else {
    res.status(401).send("Unauthorized");
  }
}

app.use(express.json({
  verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
    req.rawBody = buf.toString();
  }
}));

const port = process.env.PORT || 3030;

// PDF upload handling example
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${file.fieldname}-${uniqueSuffix}.${file.originalname.split('.').pop()}`)
  }
})

const upload = multer({ storage: storage })

app.post("/uploads", verify, upload.single('pdf'), (req: Request, res: Response) => {
  console.log({
    webhook_received: new Date().toISOString(), 
    path: req.path, 
    body: req.body,
  });

  const pdf = req.body.pdf;
  console.log({ pdf });

  res.json({ status: "ACCEPTED" });
});

// Catch all general example

app.post("*", verify, (req: Request, res: Response) => {
  console.log({
    webhook_received: new Date().toISOString(), 
    path: req.path, 
    body: req.body,
  });

  res.json({ status: "ACCEPTED" });
});

app.listen(port, () => {
  console.log(`🪝 Server running at http://localhost:${port}`);
});
