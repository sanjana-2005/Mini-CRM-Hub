const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma, redis } = require('../index');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 */
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty(),
    body('phone').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, name, phone } = req.body;

      // Check if customer already exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { email },
      });

      if (existingCustomer) {
        return res.status(400).json({ message: 'Customer already exists' });
      }

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          email,
          name,
          phone,
        },
      });

      // Publish to Redis stream for async processing
      await redis.xadd('customer_stream', '*', 'event', 'customer_created', 'data', JSON.stringify(customer));

      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Error creating customer' });
    }
  }
);

/**
 * @swagger
 * /api/customers/{id}/orders:
 *   post:
 *     summary: Add an order for a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - status
 *             properties:
 *               amount:
 *                 type: number
 *               status:
 *                 type: string
 */
router.post(
  '/:id/orders',
  [
    body('amount').isFloat({ min: 0 }),
    body('status').isIn(['PENDING', 'COMPLETED', 'CANCELLED']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { amount, status } = req.body;

      // Create order
      const order = await prisma.order.create({
        data: {
          customerId: id,
          amount,
          status,
        },
      });

      // Update customer's total spend
      await prisma.customer.update({
        where: { id },
        data: {
          totalSpend: {
            increment: amount,
          },
          visitCount: {
            increment: 1,
          },
          lastVisit: new Date(),
        },
      });

      // Publish to Redis stream for async processing
      await redis.xadd('order_stream', '*', 'event', 'order_created', 'data', JSON.stringify(order));

      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Error creating order' });
    }
  }
);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers with pagination
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: { orders: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.customer.count(),
    ]);

    res.json({
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

module.exports = router; 