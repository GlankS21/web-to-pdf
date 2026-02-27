import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
        username: {
            type: String,
            require: true,
            unique: true, 
            trim: true, // bỏ khoảng trắng
            lowercase: true
        },
        hashedPassword: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        displayName: {
            type: String, 
            required: true,
            trim: true
        },
        avatarUrl: {
            type: String,
        },
        avatarID: {
            type: String, 
        }
    },
    {
        timestamps: true, 
    }
);

const User = mongoose.model("User", userSchema);
export default User; 