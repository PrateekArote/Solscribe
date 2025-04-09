import express from "express";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable JSON parsing
app.use(express.json());

// Configure CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true, // Allow cookies and authentication headers
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Debugging logs
console.log("Registering routes...");

// Routes
app.use("/v1/user", userRouter);
console.log("User routes registered at /v1/user");

app.use("/v1/worker", workerRouter);
console.log("Worker routes registered at /v1/worker");

// Root route
app.get("/", (req, res) => {
    res.send("Backend is running!");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


