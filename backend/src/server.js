import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {connectDB} from './libs/db.js';
import authRouter from './routes/authRoute.js';
import userRouter from './routes/userRoute.js';
import convertRouter from './routes/convertRoute.js';
import historyRouter from './routes/historyRoute.js';
import cookieParser from 'cookie-parser';
import {protectedRoute} from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const PORT =  process.env.PORT || 5001;

// middewares
app.use(cors({
  origin: (origin, cb) => {
    const allowed = process.env.CLIENT_URL || '';
    if (!origin || origin === allowed || origin.endsWith('.vercel.app')) {
      cb(null, origin);
    } else {
      cb(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cookieParser());

// public routes
app.use('/api/convert', convertRouter);
app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);

// private routes
app.use(protectedRoute);
app.use('/api/users', userRouter)

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
