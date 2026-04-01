import express from "express";
import { serve } from "inngest/express";
import { functions, client } from "./lib/helpers/inngest";
import { getPrismaClient } from "./lib/helpers/prisma/getPrismaClient";
import dotenv from "dotenv";

dotenv.config();

const prisma = getPrismaClient();
const app = express();
const PORT = 3005;

// Required for Inngest POST requests to work
app.use(express.json());

app.get("/api/inngest", (req, res, next) => {
    console.log("🔍 [GET] /api/inngest discovery request");
    next();
});

app.post("/api/inngest", (req, res, next) => {
    console.log("📡 [POST] /api/inngest function execution request");
    next();
});

app.use("/api/inngest", serve({ client, functions }));

// Log all requests for debugging

console.log(`🚀 Embedded Inngest Server (Express) starting on port ${PORT}`);

// Verify DB connection on startup
prisma.$connect()
    .then(() => console.log("✅ Database connected successfully to embeddedInngestServer"))
    .catch((err: any) => console.error("❌ Database connection failed in embeddedInngestServer:", err));

app.listen(PORT, () => {
    console.log(`📡 Server listening on http://localhost:${PORT}`);
});