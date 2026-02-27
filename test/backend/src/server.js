import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './libs/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// middlewares
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use(express.json());

// public routes
app.use('/api/auth', authRouter);

// private routes
app.use(protectedRoute);

connectDB.then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })
})