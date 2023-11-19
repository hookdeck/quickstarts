import express, { Request, Response, Application } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();
app.use(express.json());

const port = process.env.PORT || 3030;

app.post("/webhook", (req: Request, res: Response) => {
  console.log({ webhook_received: new Date().toISOString(), body: req.body });

  res.json({ status: "ACCEPTED" });
});

app.listen(port, () => {
  console.log(`🪝 Server running at http://localhost:${port}`);
});
