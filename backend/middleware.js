const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');
const { User } = require('./db');

const authmidddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(403).json({
            message: "Authorization Failed (No Authorization Header)"
        });
    }else if(!authHeader.startsWith('Bearer ')){
        return res.status(403).json({
            message: "Authorization Failed (Not a Bearer token)"
        });
    }
    const token = authHeader.split(' ')[1];

    try{
        const decoded = jwt.verify(token, JWT_SECRET);
        if(decoded.userId){
            req.userId = decoded.userId;
            const user = await User.findOne({_id:decoded.userId});
            if(user.codeforcesId !== req.body.codeforcesId){
                return res.status(401).json({
                    message: "Token belongs to another user"
                })
            }
            next();
        }
        else{
            return res.status(404).json({
                message: "Unknown token"
            })
        }
    }catch(err){
        res.status(401).json({
            message: "Authorization failed due to error"
        })
    }
}

module.exports = {
    authmidddleware
}