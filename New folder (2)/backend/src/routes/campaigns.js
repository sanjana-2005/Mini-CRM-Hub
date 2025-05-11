const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma, redis } = require('../index');
const { authenticateUser } = require('../middleware/auth');
const { generateAIMessage } = require('../utils/aiUtils');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
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
 *               - segmentId
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               segmentId:
 *                 type: string
 *               message:
 *                 type: string
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('segmentId').isUUID(),
    body('message').trim().notEmpty(),
    body('scheduledFor').optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, segmentId, message, scheduledFor } = req.body;

      // Verify segment exists and belongs to user
      const segment = await prisma.segment.findFirst({
        where: {
          id: segmentId,
          createdById: req.user.id,
        },
        include: {
          customers: {
            select: {
              customerId: true,
            },
          },
        },
      });

      if (!segment) {
        return res.status(404).json({ message: 'Segment not found' });
      }

      // Create campaign
      const campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          message,
          status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          createdById: req.user.id,
          segmentId,
        },
      });

      // Create communication logs for each customer in the segment
      const communicationLogs = segment.customers.map(({ customerId }) => ({
        campaignId: campaign.id,
        customerId: customerId,
        status: 'PENDING',
      }));

      // Create logs in batches
      const batchSize = 100;
      for (let i = 0; i < communicationLogs.length; i += batchSize) {
        const batch = communicationLogs.slice(i, i + batchSize);
        await prisma.communicationLog.createMany({
          data: batch,
        });
      }

      // Publish to Redis stream for async processing
      await redis.xadd('campaign_stream', '*', 'event', 'campaign_created', 'data', JSON.stringify({
        campaignId: campaign.id,
        scheduledFor,
      }));

      res.status(201).json({
        ...campaign,
        customerCount: communicationLogs.length,
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ message: 'Error creating campaign' });
    }
  }
);

/**
 * @swagger
 * /api/campaigns/{id}/generate-message:
 *   post:
 *     summary: Generate AI-powered message for campaign
 *     tags: [Campaigns]
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
 *               - objective
 *             properties:
 *               objective:
 *                 type: string
 */
router.post(
  '/:id/generate-message',
  [body('objective').trim().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { objective } = req.body;

      // Get campaign and segment details
      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          createdById: req.user.id,
        },
        include: {
          segment: {
            include: {
              customers: {
                take: 5,
                select: {
                  customer: {
                    select: {
                      name: true,
                      totalSpend: true,
                      lastVisit: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Generate AI message
      const message = await generateAIMessage({
        objective,
        segmentName: campaign.segment.name,
        sampleCustomers: campaign.segment.customers.map(c => c.customer),
      });

      // Update campaign message
      const updatedCampaign = await prisma.campaign.update({
        where: { id },
        data: { message },
      });

      res.json(updatedCampaign);
    } catch (error) {
      console.error('Error generating message:', error);
      res.status(500).json({ message: 'Error generating message' });
    }
  }
);

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        createdById: req.user.id,
      },
      include: {
        segment: {
          select: {
            name: true,
            _count: {
              select: { customers: true },
            },
          },
        },
        _count: {
          select: { communications: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get delivery stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await prisma.communicationLog.groupBy({
          by: ['status'],
          where: { campaignId: campaign.id },
          _count: true,
        });

        return {
          ...campaign,
          stats: stats.reduce((acc, curr) => {
            acc[curr.status.toLowerCase()] = curr._count;
            return acc;
          }, {}),
        };
      })
    );

    res.json(campaignsWithStats);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Error fetching campaigns' });
  }
});

module.exports = router; 