import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
    try{
        const {username, password, email, firstName, lastName} = req.body;
        if(!username || !password || !email || !firstName || !lastName){
            return res.status(400).json({
                message: "need info",
            });
        }
        // kiểm tra use tồn tại 
        const duplicate = await User.findOne({username});
        if(duplicate){
            return res.status(409).json({message: "username used"});
        }

        // mã hóa 
        const hashedPassword = await bcrypt.hash(password, 10); // salt = 10

        // tạo user mới
        await User.create({
            username,
            hashedPassword,
            email,
            displayName: `${firstName} ${lastName}`
        });

        return res.sendStatus(204);
    }  catch(error){
        console.error('Error signUp', error);
        return res.status(500).json({message: 'Error'});
    }
};

export const signIn = async (req, res) => {
    try{
        // lấy inputs
        const {username, password} = req.body;
        
        if(!username || !password) {
            return res.status(400).json({message: "Need user name or password"});
        }

        // lấy hash password 
        const user = await User.findOne({username});
        if(!user){
            return res.status(401).json({message: "user or password not correct"});
        }

        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

        if(!passwordCorrect){
            return res.status(401).json({message: "user or password not correct"});
        }
        // nếu khớp tạo accessTonken vs JWWT
        const accessToken = jwt.sign({userId: user._id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_TTL});

        // tạo refresh token
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
        })

        return res.status(200).json({message: `User ${user.displayName} logged in`, accessToken});

    }
    catch(error){
        console.error("Error signIn");
        return res.status(500).json({message: 'Error'});
    }
};

export const signOut = async(req, res) => {
    try{
        //lấy refreh token từ cookie
        const token = req.cookies?.refreshToken;

        if(token){
            await Session.deleteOne({refreshToken: token});

            res.clearCookie("refreshToken");
        }
        // xóa refresh token trong session 

        return res.sendStatus(204);
    }
    catch(error){
        console.error("Error signout", error);
        return res.status(500).json({message:" error"});
    }
}

export const refreshToken = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "The token does not exist" });
    }

    // so với refresh token trong db
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // kiểm tra hết hạn chưa
    if (session.expiresAt < new Date()) {
      return res.status(403).json({ message: "The token has expired" });
    }

    // tạo access token mới
    const accessToken = jwt.sign(
      {
        userId: session.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // return
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error refreshToken", error);
    return res.status(500).json({ message: "Server error" });
  }
};