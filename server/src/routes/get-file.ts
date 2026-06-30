import { Router } from "express";
import { z } from "zod";

const app: Router = Router();
const backend_url = process.env.BACKEND_URL || "http://127.0.0.1:8000";

app.post("/", async (req, res) => {
    // The frontend sends either { filePath: string } or { path: string }
    const schema = z.object({
        filePath: z.string().optional(),
        path: z.string().optional(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const filePath = result.data.filePath || result.data.path;
    if (!filePath) {
        return res.status(400).json({ error: "No file path provided" });
    }

    try {
        const response = await fetch(`${backend_url}/get_file`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ file_path: filePath }),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch file from python backend: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status === "error") {
            console.error(`Python backend returned error for ${filePath}:`, data.message);
            return res.status(404).json({ error: data.message });
        }
        // Send back standard JSON { content: string }
        res.json({ content: data.content });
    } catch (error) {
        console.error("Error fetching file:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/", async (req, res) => {
    // The frontend might send GET request with query params
    const filePath = req.query.filePath || req.query.path;
    if (!filePath || typeof filePath !== "string") {
        return res.status(400).json({ error: "No file path provided" });
    }

    try {
        const response = await fetch(`${backend_url}/get_file`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ file_path: filePath }),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch file from python backend: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status === "error") {
            return res.status(404).json({ error: data.message });
        }
        res.json({ content: data.content });
    } catch (error) {
        console.error("Error fetching file:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default app;
