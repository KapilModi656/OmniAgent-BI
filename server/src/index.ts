import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import loginRouter from "./routes/login.js";
import chatsRouter from "./routes/chats.js";
import trainRouter from "./routes/train.js";
import predictionRouter from "./routes/prediction.js";
import signinRouter from "./routes/signin.js";
import getFileRouter from "./routes/get-file.js";
import getDatasetsRouter from "./routes/get-datasets.js";
import userRouter from "./routes/user.js";
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000);
const app = express();

async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authorization = req.headers['authorization'];
    const token = authorization && authorization.split(' ')[1];
    if (token == null) return res.status(401).json({ error: "Unauthorized" });
    try{
        const user = jwt.verify(token, process.env.JWT_SECRET as string);
        console.log("Authenticated user:", user);
        if(typeof user === "object" && "userId" in user) {
            res.locals.userId = user.userId;
        }
        else{
            return res.status(401).json({ error: "Invalid token" });
        }
        next();
    }
    catch(err){
        console.error("Token verification error:", err);
        return res.status(403).json({ error: "Invalid token" });
    }
    
}

app.use(cors());
app.use(express.json());

app.use("/login", loginRouter);
app.use("/signin", signinRouter);
app.use("/chats", authenticateToken, chatsRouter);
app.use("/train", authenticateToken, trainRouter);
app.use("/predict", authenticateToken, predictionRouter);
app.use("/get-file", authenticateToken, getFileRouter);
app.use("/get-datasets", authenticateToken, getDatasetsRouter);
app.use("/user", authenticateToken, userRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
