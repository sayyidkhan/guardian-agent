import "dotenv/config";
import express from "express";
import cors from "cors";
import profileHandler from "./api/profile.js";
import askHandler from "./api/ask-guardian.js";
import speechmaticsTranscribeHandler from "./api/speechmatics-transcribe.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.all("/api/profile", profileHandler);
app.all("/api/ask-guardian", askHandler);
app.all("/api/speechmatics/transcribe", speechmaticsTranscribeHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
