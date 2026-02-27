import { use } from 'react';
import User from '../models/User.js';
import bcrypt from 'bcrypt';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const SignUp = async(req, res) => {
    try{
        const {username, password, email, firstName, lastName} = req.body;
        if(!username || !password || !email || !firstName || !lastName){
            return res.status(400).json({
                message: "You need to enter all the information"
            });
        }
         
        // Check if the use exists
        const user = await User.findOne({username});
        if(user){
            return res.status(409).json({
                message: "user already exists",
            });
        }

        // password encryption with salt = 10
        const hashedPassword = await bcrypt.hash(password, 10); 

        // created new user
        await User.create({
            username, 
            hashedPassword,
            email,
            displayName: `${firstName} ${lastName}`
        });

        return res.sendStatus(204);
    }  catch(error){
        return res.status(500).json({
            message: 'Server error'
        });
    }
};

export const SignIn = async(req, res) => {
    try{
        const {username, password} = req.body;
        if(!username || !password){
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        // Get password hash
        const user = await User.findOne({username});
        if(!user){
            return res.status(400).json({
                message: 'Incorrect username or password'
            });
        }

        const ComparePassword = await bcrypt.compare(password, user.hashedPassword);
        if(!ComparePassword){
            return res.status(400).json({
                message: 'Incorrect username or password'
            });
        }

        // Create access tokens and JWT
        const accessToken = jwt.sign({userId: user._id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_TTL});

        // Create refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');

        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });
        
        res.cookie('refreshToken', refreshToken,{
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL,
        });

        return res.status(200).json({
            message: `User ${user.displayName} logged in`, accessToken
        });
    } catch(error){
        res.status(500).json({
            message: 'server error'
        });
    }
}

export const SignOut = async(req, res) => {
    try{
        // Get refresh token from cookie
        const token = req.cookie?.refreshToken;
        if(token){
            await Session.deleteOne({refreshToken: token});
            res.clearCookie("refreshToken");
        }
        return res.sendStatus(204);
    } catch(error){
        res.status(500).json({
            message: 'server error'
        });
    }
}