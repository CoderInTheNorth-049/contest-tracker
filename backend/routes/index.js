const express = require('express');
const authRoutes = require('./auth');
const contestRoutes = require('./contest');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/contest', contestRoutes);

module.exports = router;