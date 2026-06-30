import { Router } from "express";
import { prisma } from "../db.js";

const app: Router = Router();

app.get("/me", async (req, res) => {
    const userId = res.locals.userId;
    
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default app;
