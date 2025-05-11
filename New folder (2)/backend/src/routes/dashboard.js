const express = require('express');
const router = express.Router();
const { prisma } = require('../index'); // Assuming Prisma is initialized in index.js

router.get('/stats', async (req, res) => {
  try {
    // Example stats data
    const userCount = await prisma.user.count();
    const segmentCount = await prisma.segment.count();

    res.json({
      users: userCount,
      segments: segmentCount,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;