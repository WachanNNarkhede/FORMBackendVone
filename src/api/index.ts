import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../app.js";
import { connectDB } from "../config/db.js";

let dbConnected = false;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }

  return app(req, res);
}