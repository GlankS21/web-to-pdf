import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {connectDB} from './libs/db.js';
import authRouter from './routes/authRoute.js';
import userRouter from './routes/userRoute.js';
import convertRouter from './routes/convertRoute.js';
import cookieParser from 'cookie-parser';
import {protectedRoute} from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const PORT =  process.env.PORT || 5001;

// middewares
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use(express.json());
app.use(cookieParser());

// public routes
app.use('/api/convert', convertRouter);
app.use('/api/auth', authRouter);

// private routes
app.use(protectedRoute);
app.use('/api/users', userRouter)

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
