import mongoose from 'mongoose';

export const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_CONNECTIONS);
        console.log('Database connection successful');
    } catch(error){
        console.log('Error connection Database', error);
        process.exit(1);
    }
}