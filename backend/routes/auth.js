const express = require('express');
const { User } = require('../db');
const { JWT_SECRET } = require('../config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();


router.post('/connect', async (req, res) => {

  const { codeforcesId, password } = req.body;

  try {
    let user = await User.findOne({ codeforcesId });
    //if codeforcesId already exists
    if (user) {
      const passwordIsValid = await bcrypt.compare(password, user.password);
      
      if(passwordIsValid){
        const token = jwt.sign({userId:_id}, JWT_SECRET);
        return res.status(200).json({
          message: 'Signin successfully',
          token: token
        });
      }else{
        return res.status(401).json({
          message: 'Invalid Password / This ID is already Registered'
        })
      }
    }
    // check username is Codeforces handle
    const userData = await axios.get(`https://codeforces.com/api/user.info?handles=${codeforcesId}`);
    if(userData.data.status === "FAILED"){
      return res.status(401).json({
        message: "Invalid Codeforces ID"
      })
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    user = new User({ codeforcesId, password: hashedPassword, contests: [], highestRating: 0 });
    await user.save();

    const token = jwt.sign({
      userId:user._id
    }, JWT_SECRET)
    res.status(200).json({
        message: "User created successfully",
        token: token
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

module.exports = router;
