import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protectedRoute = (req, res, next) => {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(" ")[1]; // bearer <token>
        
        if(!token) {
            return res.status(401).json({message: "Not found access token"});
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decodedUser) =>{
            if(err){
                console.error(err);
                return res.status(403).json({message: "Access token het han "});
            }

            const user = await User.findById(decodedUser.userId).select('-hashedPassword');

            if(!user){
                return res.status(404).json({message: 'User da ton tai'});
            }
            
            req.user = user;
            next();
        });
    }
    catch(error){
        console.error('Error with JWT form authMiddleware', error);
        return res.status(500).json({message: "Error"});
    }
}