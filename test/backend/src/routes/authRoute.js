import express, { Router } from 'express';
import {SignUp, SignIn, SignOut } from '../controllers/authController';

const router = express.Router();

router.post("/signup", SignUp);

router.post("/signin", SignIn);

router.post("/signout", SignOut);

export default router;
