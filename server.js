import "dotenv/config";
import express from "express";
import cors from "cors";
import profileHandler from "./api/profile.js";
import askHandler from "./api/ask-guardian.js";
import speechmaticsTranscribeHandler from "./api/speechmatics-transcribe.js";
import healthHandler from "./api/health.js";
import vapiConfigHandler from "./api/vapi-config.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.all("/api/profile", profileHandler);
app.all("/api/ask-guardian", askHandler);
app.all("/api/speechmatics/transcribe", speechmaticsTranscribeHandler);
app.all("/api/health", healthHandler);
app.all("/api/vapi-config", vapiConfigHandler);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the old API process and retry.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

function shutdown(signal) {
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
