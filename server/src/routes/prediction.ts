import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });
const app:Router = Router();
const backend_url = process.env.BACKEND_URL || "http://127.0.0.1:8000";

app.post("/get-fields", async (req, res) => {
    const schema = z.object({
        chatId: z.number().int().positive().max(2147483647),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { chatId } = result.data;
    const userId = res.locals.userId;
    try {
        const response = await prisma.datasetColumn.findMany({
            where: {
                chatsId: chatId,
                userId: userId,
            },
            select: {
                columnName: true,
                columnType: true,
            },
        });
        const columns = response.map((col) => ({
            name: col.columnName,
            type: col.columnType,
        }));
        res.json({ columns });
    } catch (error) {
        console.error("Error fetching dataset columns:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/",async (req, res) => {

    const schema = z.object({
        chatId: z.number().int().positive(),
        inputData: z.record(z.string(), z.any()),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { chatId, inputData } = result.data;
    const userId = res.locals.userId;
    const chat = await prisma.chat.findUnique({
        where: { id: chatId, userId: userId },
    });
    const pipelineUrl = chat?.pipelineUrl;
    const trainingUrl = chat?.trainingUrl;
    if (!pipelineUrl || !trainingUrl) {
        return res.status(400).json({ error: "Pipeline not found for this chat" });
    }
    const columns = await prisma.datasetColumn.findMany({
        where: {
            chatsId: chatId,
            userId: userId,
        },
    });
   
    try {
        const response = await fetch(`${backend_url}/save_dataset`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ chatid: chatId, userid: userId, input_data: inputData }),
            
        });
        if (!response.ok) {
            throw new Error(`Failed to save dataset: ${response.statusText}`);
        }
        const result = await response.json();
        const datasetUrl = result.filepath;
        const predictionResponse = await fetch(`${backend_url}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userid: userId, chatid: chatId, 
                pipeline_path: pipelineUrl, training_path: trainingUrl,
                dataset_columns: columns ,dataset_url: datasetUrl, 
                target_column: columns.find(col => col.targetColumn)?.columnName || null}),
           
        });
        if (!predictionResponse.ok) {
            throw new Error(`Failed to make prediction: ${predictionResponse.statusText}`);
        }
        const predictionData = await predictionResponse.json();

        if (!predictionData.predictions_path) {
            throw new Error("Failed to extract predictions_path from model output.");
        }

        const dataset = await prisma.dataset.create({
            data: {
                userId: userId,
                chatsId: chatId,
                datasetUrl: datasetUrl,
                isTraining: false,
            }
        });
        await prisma.prediction.create({
            data: {
                datasetId: dataset.id,
                predictionUrl: predictionData.predictions_path
            }
        });

        res.json(predictionData);
    } catch (error) {
        console.error("Error making prediction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



app.post("/predict-file", upload.single("file"), async (req, res) => {
    if(!req.file){
        return res.status(400).json({ error: "No file uploaded" });
    }

    const schema = z.object({
        chatId: z.coerce.number().int().positive()
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { chatId } = result.data;
    const userId = res.locals.userId;
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
    const chat = await prisma.chat.findUnique({
        where: { id: chatId, userId: userId },
    });
    const pipelineUrl = chat?.pipelineUrl;
    const trainingUrl = chat?.trainingUrl;
    if (!pipelineUrl || !trainingUrl) {
        return res.status(400).json({ error: "Pipeline not found for this chat" });
    }
    const columns = await prisma.datasetColumn.findMany({
        where: {
            chatsId: chatId,
            userId: userId,
        },
    });

        const datasetUrl = filePath;
        const predictionResponse = await fetch(`${backend_url}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userid: userId, chatid: chatId, 
                pipeline_path: pipelineUrl, training_path: trainingUrl,
                dataset_columns: columns ,dataset_url: datasetUrl, 
                target_column: columns.find(col => col.targetColumn)?.columnName || null}),
        });
        if (!predictionResponse.ok) {
            throw new Error(`Failed to make prediction: ${predictionResponse.statusText}`);
        }
        const predictionData = await predictionResponse.json();

        if (!predictionData.predictions_path) {
            throw new Error("Failed to extract predictions_path from model output.");
        }

        const dataset = await prisma.dataset.create({
            data: {
                userId: userId,
                chatsId: chatId,
                datasetUrl: datasetUrl,
                isTraining: false,
            }
        });
        await prisma.prediction.create({
            data: {
                datasetId: dataset.id,
                predictionUrl: predictionData.predictions_path
            }
        });

        res.json(predictionData);
    } catch (error) {
        console.error("Error making prediction:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



export default app;