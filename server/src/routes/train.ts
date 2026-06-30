import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import multer from "multer";
const app:Router = Router();
const backend_url = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const upload = multer({ storage: multer.memoryStorage() });
app.post("/", upload.single("file"), async (req, res) => {
    if(!req.file){
        return res.status(400).json({ error: "No file uploaded" });
    }
    const schema = z.object({
        chatId: z.coerce.number().int().positive().max(2147483647)
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { chatId } = result.data;
    let userId = res.locals.userId;
    userId = Number(userId);
    try {
       
        const data2 =new FormData();
        const fileBlob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
        data2.append("file", fileBlob, req.file.originalname);
        data2.append("chatid", chatId.toString());
        data2.append("userid", userId.toString());
        const response = await fetch(`${backend_url}/upload_file`, {
            method: "POST",
            body: data2, 
        });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${errorText}`);
    }
    const fileResponse = await response.json();
    const filePath = fileResponse.filepath;
    

    const trainResponse = await fetch(`${backend_url}/train`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatid: chatId, userid: userId, dataset_url: filePath }),
        signal: AbortSignal.timeout(2400000) // 20 minutes timeout
    });
    if (!trainResponse.ok) {
        throw new Error(`Failed to train model: ${trainResponse.statusText}`);
    }
    
    const trainResult = await trainResponse.json();
    if(trainResult.status === "error"){
        throw new Error(`Training error: ${trainResult.message}`);
    }
    const pipeline_path = trainResult.pipeline_path;
    const edaPaths = trainResult.eda_output;
    const trainingPath = trainResult.training_path;
    const dataset_columns = trainResult.dataset_analyzer_output.column_types;
    const modelMetrics = trainResult.model_metrics ? JSON.stringify(trainResult.model_metrics) : null;
    await prisma.chat.update({
        where: { id: chatId },
        data: {
            pipelineUrl: pipeline_path,
            trainingUrl: trainingPath,
            modelMetrics: modelMetrics,
        },
    });
    const dataset = await prisma.dataset.create({
        data: {
            chatsId: chatId,
            userId: userId,
            datasetUrl: filePath,
            isTraining: true,
        }
    });
    console.log("Eda Paths:", edaPaths);
    if (edaPaths && Array.isArray(edaPaths)) {
            await Promise.all(
                edaPaths.map((edaPath: string) =>
                    prisma.edaUrls.create({
                        data: {
                            datasetId: dataset.id,
                            url: edaPath,
                        },
                    })
                )
            );
        }
        console.log("dataset_columns:", dataset_columns);
        if (dataset_columns) {
            await prisma.datasetColumn.createMany({
                data: Object.entries(dataset_columns).map(([name, type]) => ({
                    userId: userId,
                    chatsId: chatId,
                    columnName: name,
                    columnType: String(type), // Ensure it stays a string
                    targetColumn: name === trainResult.dataset_analyzer_output.target_column, // Mark the target column
                })),
            });
        }
    res.json({ message: "Training completed successfully", pipeline_path, edaPaths, trainingPath });
    } catch (error) {
        console.error("Error during training:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default app;

