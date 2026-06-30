import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const app: Router = Router();

app.get("/", async (req, res) => {
    const schema = z.object({
        chatId: z.coerce.number().int().positive().max(2147483647)
    });
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { chatId } = result.data;
    const userId = res.locals.userId;

    try {
        const datasets = await prisma.dataset.findMany({
            where: {
                chatsId: chatId,
                userId: userId,
            },
            include: {
                prediction: true,
                edaUrls: true,
            },
            orderBy: {
                id: 'asc'
            }
        });

        // The frontend expects a list of objects with:
        // { datasetUrl: string, isTraining: boolean, predictionUrl: string | null }
        const formattedDatasets = datasets.map((d) => ({
            id: d.id,
            datasetUrl: d.datasetUrl,
            isTraining: d.isTraining,
            predictionUrl: d.prediction ? d.prediction.predictionUrl : null,
            edaUrls: d.edaUrls.map(e => e.url)
        }));

        res.json(formattedDatasets);
    } catch (error) {
        console.error("Error fetching datasets:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default app;
