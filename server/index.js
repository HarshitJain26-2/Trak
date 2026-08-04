require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { verifyUserAuth, verifyInternalKey } = require('./middleware/auth');
const { sendPushNotification, checkPushReceipts } = require('./services/pushService');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'trak-express-server',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/notifications/test
 * User-triggered test notification endpoint.
 * Protected by verifyUserAuth (Requires Bearer <supabase_jwt>).
 */
app.post('/api/notifications/test', verifyUserAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[Express API] Manual test notification request from user: ${userId}`);

    const result = await sendPushNotification(
      userId,
      '🔔 Trak Test Push Notification',
      'Your push notification pipeline is working end-to-end!',
      { url: '/(tabs)/profile', type: 'test' }
    );

    return res.json({
      success: result.success,
      message: result.message || 'Test push notification request processed.',
      sentCount: result.sentCount || 0,
      receiptIds: result.receiptIds || [],
    });
  } catch (err) {
    console.error('[Express API Error] Test push failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/send-user
 * Server-to-server endpoint to send a notification to a specific user.
 * Protected by verifyInternalKey (Requires X-Internal-Key header).
 */
app.post('/api/notifications/send-user', verifyInternalKey, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, title, body',
      });
    }

    const result = await sendPushNotification(userId, title, body, data);
    return res.json(result);
  } catch (err) {
    console.error('[Express API Error] send-user failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/check-receipts
 * Server-to-server endpoint to inspect push delivery receipts and prune invalid tokens.
 * Protected by verifyInternalKey (Requires X-Internal-Key header).
 */
app.post('/api/notifications/check-receipts', verifyInternalKey, async (req, res) => {
  try {
    const { receiptIds } = req.body;

    if (!receiptIds || !Array.isArray(receiptIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid receiptIds array parameter.',
      });
    }

    const result = await checkPushReceipts(receiptIds);
    return res.json(result);
  } catch (err) {
    console.error('[Express API Error] check-receipts failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/trigger-event
 * Example trigger endpoint (e.g. project completed, reminder alert, or analysis ready).
 * Protected by verifyInternalKey (Requires X-Internal-Key header).
 */
app.post('/api/notifications/trigger-event', verifyInternalKey, async (req, res) => {
  try {
    const { userId, eventType, projectName, projectId } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, eventType',
      });
    }

    let title = 'Trak Notification';
    let body = `Event triggered: ${eventType}`;
    const payload = { eventType, projectId, url: projectId ? `/project/${projectId}` : '/(tabs)/index' };

    switch (eventType) {
      case 'PROJECT_DEADLINE_APPROACHING':
        title = `⏰ Deadline Approaching: ${projectName || 'Project'}`;
        body = `Your project deadline is approaching soon. Tap to review status.`;
        break;

      case 'PROJECT_SHARED':
        title = `👥 Shared Project Update`;
        body = `You were added to "${projectName || 'a project'}". Tap to open.`;
        break;

      case 'MILESTONE_COMPLETED':
        title = `🚀 Milestone Completed!`;
        body = `A feature milestone in "${projectName || 'Project'}" was marked complete.`;
        break;

      default:
        title = `📢 Notification: ${eventType}`;
        body = `Project update for ${projectName || 'your project'}.`;
        break;
    }

    const result = await sendPushNotification(userId, title, body, payload);
    return res.json(result);
  } catch (err) {
    console.error('[Express API Error] trigger-event failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Trak Push Notification Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
