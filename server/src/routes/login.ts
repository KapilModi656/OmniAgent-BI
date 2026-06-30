import { Router } from "express";
import {prisma} from "../db.js";
import zod from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const app: Router = Router();

app.post("/", async (req, res) => {
    const schema = zod.object({
        email: zod.email().min(5).max(255),
        password: zod.string().min(6).max(100),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { email, password } = result.data;
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });
    if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
      
        const token = jwt.sign({ userId: user.id },process.env.JWT_SECRET||"your_jwt_secret_key");
        res.json({ token: token });
});

export default app;