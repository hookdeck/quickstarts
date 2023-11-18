import express, { Request, Response, Application } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3030;

app.post("/webhook", (req: Request, res: Response) => {
  res.send("OK");
});

app.listen(port, () => {
  console.log(`🪝 Server running at http://localhost:${port}`);
});
