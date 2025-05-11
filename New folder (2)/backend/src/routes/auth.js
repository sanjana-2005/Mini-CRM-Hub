const express = require('express');
const jwt = require('jsonwebtoken');
const { prisma } = require('../index');
const { verifyGoogleToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Ensure JWT_SECRET is defined
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the environment variables');
}

// Rate limiter
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

// Middleware for token verification
const verifyTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Authorization Header:', authHeader); // Log the header for debugging

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No token provided in Authorization header');
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded); // Log the decoded token
    req.user = decoded; // Attach decoded user info to the request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error('Token has expired');
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    console.error('Invalid token:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Google OAuth route
router.post('/google', authRateLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const payload = await verifyGoogleToken(token).catch((error) => {
      console.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    });

    const { email, name, sub: googleId } = payload;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
        },
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
});

// Verify JWT route
router.get('/verify', authRateLimiter, verifyTokenMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;