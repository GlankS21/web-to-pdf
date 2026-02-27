import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const ProtectedRoute = (req, res, next) => {
    try {
        // Get the token from the header
        const AuthHeader = req.headers["authorization"];
        const token = AuthHeader && AuthHeader.split(" ")[1]; // Bearer <token>

        if (!token) {
            return res.status(401).json({ 
                message: "Access token not found" 
            });
        }

        // Verify valid token
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (error, decodedUser) => {
            if (error) {
                return res.status(403).json({ 
                    message: "Access token has expired or is incorrect" 
                });
            }

            // find user
            const user = await User.findById(decodedUser.userId).select("-hashedPassword");
            if (!user) {
                return res.status(404).json({ 
                    message: "The user does not exist" 
                });
            }
            req.user = user;
            next();
        });
    } catch(error){
        res.status(500).json({
            message: 'server error'
        });
    }
}