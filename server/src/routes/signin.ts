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
        name: zod.string().min(2).max(100),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    const { email, password, name } = result.data;
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    });
    if (user) {
            return res.status(401).json({ error: "User already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
        data: {
            email: email,
            password: passwordHash,
            name: name,
        },
    });
    const token = jwt.sign({ userId: newUser.id },process.env.JWT_SECRET||"your_jwt_secret_key");
    res.json({ token: token });
});

export default app;