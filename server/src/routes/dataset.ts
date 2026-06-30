import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const app:Router = Router();

app.post("/dataset-columns",async (req, res) => {
    const schema = z.object({
        datasetId: z.number().int().positive()
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { datasetId } = result.data;
    const userId = res.locals.userId;
    try {
        const dataset = await prisma.datasetColumn.findMany({
            where: {
                chatsId: datasetId,
            }
        });
        if (!dataset) {
            return res.status(404).json({ error: "Dataset not found" });
        }
        res.json({ columns: dataset.filter((col) => col.targetColumn === false).map((col) => col.columnName) });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default app;