const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../index');
const { authenticateUser } = require('../middleware/auth');
const { evaluateSegmentRules } = require('../utils/segmentEvaluator');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/segments:
 *   post:
 *     summary: Create a new segment
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rules
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rules:
 *                 type: object
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('rules').isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, rules } = req.body;

      // Create segment
      const segment = await prisma.segment.create({
        data: {
          name,
          description,
          rules,
          createdById: req.user.id,
        },
      });

      // Evaluate rules and add matching customers
      const matchingCustomers = await evaluateSegmentRules(rules);
      
      // Add customers to segment in batches
      const batchSize = 100;
      for (let i = 0; i < matchingCustomers.length; i += batchSize) {
        const batch = matchingCustomers.slice(i, i + batchSize);
        await prisma.customerSegment.createMany({
          data: batch.map(customerId => ({
            customerId,
            segmentId: segment.id,
          })),
          skipDuplicates: true,
        });
      }

      res.status(201).json({
        ...segment,
        customerCount: matchingCustomers.length,
      });
    } catch (error) {
      console.error('Error creating segment:', error);
      res.status(500).json({ message: 'Error creating segment' });
    }
  }
);

/**
 * @swagger
 * /api/segments/preview:
 *   post:
 *     summary: Preview segment size based on rules
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rules
 *             properties:
 *               rules:
 *                 type: object
 */
router.post(
  '/preview',
  [body('rules').isObject()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rules } = req.body;
      const matchingCustomers = await evaluateSegmentRules(rules);

      res.json({
        customerCount: matchingCustomers.length,
        sampleCustomers: matchingCustomers.slice(0, 5),
      });
    } catch (error) {
      console.error('Error previewing segment:', error);
      res.status(500).json({ message: 'Error previewing segment' });
    }
  }
);

/**
 * @swagger
 * /api/segments:
 *   get:
 *     summary: Get all segments
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const segments = await prisma.segment.findMany({
      where: {
        createdById: req.user.id,
      },
      include: {
        _count: {
          select: { customers: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(segments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ message: 'Error fetching segments' });
  }
});

/**
 * @swagger
 * /api/segments/{id}:
 *   get:
 *     summary: Get segment details
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const segment = await prisma.segment.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true },
        },
        customers: {
          take: 10,
          select: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                totalSpend: true,
                visitCount: true,
                lastVisit: true,
              },
            },
          },
        },
      },
    });

    if (!segment) {
      return res.status(404).json({ message: 'Segment not found' });
    }

    res.json(segment);
  } catch (error) {
    console.error('Error fetching segment:', error);
    res.status(500).json({ message: 'Error fetching segment' });
  }
});

module.exports = router; 