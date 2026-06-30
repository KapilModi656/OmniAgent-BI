import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const app:Router = Router();

app.post("/create", async (req, res) => {
    const schema = z.object({
        name: z.string().min(1).max(100),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { name } = result.data;
    const userId = res.locals.userId;
    try {
        const date = new Date();
        const timestamp = date.getTime();
        const chat = await prisma.chat.create({
            data: {
                name,
                userId,
                createdAt: date,
            },
        });
        res.json({
            "chatId": chat.id,
            "name": chat.name,
            "createdAt": timestamp,
            "pipelineUrl": chat.pipelineUrl,
            "trainingUrl": chat.trainingUrl
        })
    } catch (error) {
        console.error("Error creating chat:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/delete",async (req, res) => {
    const schema = z.object({
        id: z.number().int().positive()
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { id } = result.data;
    const userId = res.locals.userId;
    try {
        const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
        const formData = new FormData();
        formData.append("userid", String(userId));
        formData.append("chatid", String(id));
        
        try {
            await fetch(`${backendUrl}/delete_chat_data`, {
                method: "POST",
                body: formData,
            });
        } catch (backendError) {
            console.error("Failed to delete chat data from volume:", backendError);
            // We proceed with database deletion even if physical deletion fails
        }

        const chat = await prisma.chat.delete({
            where: {
                id,
                userId,
            },
        });
        res.json({ chat });
    } catch (error) {
        console.error("Error deleting chat:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/list", async (req, res) => {
    
    const userId  = res.locals.userId;
    try {
        const chats = await prisma.chat.findMany({
            where: {
                userId,
            },
        });
        res.json({ chats });
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.put("/rename", async (req, res) => {
    const schema = z.object({
        id: z.number().int().positive(),
        newName: z.string().min(1).max(100),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { id, newName } = result.data;
    const userId = res.locals.userId;
    try {
        const chat = await prisma.chat.update({
            where: {
                id,
                userId,
            },
            data: {
                name: newName,
            },
        });
        res.json({ chat });
    } catch (error) {
        console.error("Error renaming chat:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default app;