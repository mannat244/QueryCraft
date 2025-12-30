import express from 'express';
import { startLlamaServer, isLlamaServerRunning, stopLlamaServer } from '../libs/llamaProcess.js';
import fetch from 'node-fetch';

const router = express.Router();

// Helper to poll for server health
async function waitForServer(retries = 10, delay = 1000) {
    const healthUrl = "http://127.0.0.1:8080/health"; // Llama.cpp usually exposes this or we can try chat/completions HEAD

    for (let i = 0; i < retries; i++) {
        try {
            // Llama.cpp server main page or simple GET usually returns 200 or 404 (if no index), but connection is what matters.
            // Using /v1/models is a standard check
            const res = await fetch("http://127.0.0.1:8080/v1/models", { method: 'GET' });
            if (res.ok) return true;
        } catch (e) {
            // Connection refused, wait and retry
        }
        await new Promise(r => setTimeout(r, delay));
    }
    return false;
}


router.post('/start', async (req, res) => {
    try {
        console.log("[API] Request to start Llama Server");

        if (isLlamaServerRunning()) {
            return res.json({ status: "already_running", message: "Server is already active." });
        }

        const { useGpu, threads } = req.body;
        startLlamaServer({ useGpu, threads });

        // Wait up to 10 seconds for it to satisfy a health check
        const ready = await waitForServer();

        if (ready) {
            res.json({ status: "started", message: "Llama Server started and ready." });
        } else {
            // It might still be loading the model (big models take time), but process is running.
            res.json({ status: "initializing", message: "Server process started, but model is still loading. Please wait a moment." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to start server: " + error.message });
    }
});

router.post('/stop', (req, res) => {
    const stopped = stopLlamaServer();
    if (stopped) {
        res.json({ status: "stopped", message: "Llama Server stopped." });
    } else {
        res.json({ status: "not_running", message: "Server was not running." });
    }
});

export default router;
