export const authMe = async(req, res) => {
    try{
        const user = req.user;

        return res.status(200).json({user});
    }
    catch(error){
        console.error("error auth", error);
        res.status(500).json({message: "error"});
    }
}