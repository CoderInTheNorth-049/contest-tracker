const express = require('express');
const { User } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { codeforcesId } = req.body;

  try {
    let user = await User.findOne({ codeforcesId });
    if (user) {
      return res.status(409).json({
        message: 'User already exists.',
      });
    }
    user = new User({ codeforcesId, contests: [], highestRating: 0 });
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

module.exports = router;
