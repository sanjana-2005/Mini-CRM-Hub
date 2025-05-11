const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma, redis } = require('../index');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/delivery/receipt:
 *   post:
 *     summary: Update delivery status for a communication
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - communicationId
 *               - status
 *             properties:
 *               communicationId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [SENT, FAILED]
 *               errorMessage:
 *                 type: string
 */
router.post(
  '/receipt',
  [
    body('communicationId').isUUID(),
    body('status').isIn(['SENT', 'FAILED']),
    body('errorMessage').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { communicationId, status, errorMessage } = req.body;

      // Update communication log
      const communication = await prisma.communicationLog.update({
        where: { id: communicationId },
        data: {
          status,
          errorMessage,
          sentAt: status === 'SENT' ? new Date() : null,
        },
        include: {
          campaign: true,
        },
      });

      // Publish to Redis stream for async processing
      await redis.xadd('delivery_stream', '*', 'event', 'delivery_updated', 'data', JSON.stringify({
        communicationId,
        status,
        campaignId: communication.campaignId,
      }));

      res.json(communication);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      res.status(500).json({ message: 'Error updating delivery status' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/batch:
 *   post:
 *     summary: Update delivery status for multiple communications
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - communicationId
 *                     - status
 */
router.post(
  '/batch',
  [
    body('updates').isArray(),
    body('updates.*.communicationId').isUUID(),
    body('updates.*.status').isIn(['SENT', 'FAILED']),
    body('updates.*.errorMessage').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates } = req.body;

      // Process updates in batches
      const batchSize = 100;
      const results = [];

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (update) => {
            const { communicationId, status, errorMessage } = update;

            const communication = await prisma.communicationLog.update({
              where: { id: communicationId },
              data: {
                status,
                errorMessage,
                sentAt: status === 'SENT' ? new Date() : null,
              },
              include: {
                campaign: true,
              },
            });

            // Publish to Redis stream for async processing
            await redis.xadd('delivery_stream', '*', 'event', 'delivery_updated', 'data', JSON.stringify({
              communicationId,
              status,
              campaignId: communication.campaignId,
            }));

            return communication;
          })
        );

        results.push(...batchResults);
      }

      res.json(results);
    } catch (error) {
      console.error('Error updating batch delivery status:', error);
      res.status(500).json({ message: 'Error updating batch delivery status' });
    }
  }
);

/**
 * @swagger
 * /api/delivery/stats/{campaignId}:
 *   get:
 *     summary: Get delivery statistics for a campaign
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/stats/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Verify campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        createdById: req.user.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Get delivery statistics
    const stats = await prisma.communicationLog.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    // Calculate delivery rate
    const total = stats.reduce((acc, curr) => acc + curr._count, 0);
    const sent = stats.find(s => s.status === 'SENT')?._count || 0;
    const failed = stats.find(s => s.status === 'FAILED')?._count || 0;
    const pending = stats.find(s => s.status === 'PENDING')?._count || 0;

    res.json({
      total,
      sent,
      failed,
      pending,
      deliveryRate: total > 0 ? (sent / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({ message: 'Error fetching delivery stats' });
  }
});

module.exports = router; 