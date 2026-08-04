const { Expo } = require('expo-server-sdk');
const { supabase } = require('../middleware/auth');

// Create Expo SDK client
const expo = new Expo();

/**
 * Clean invalid push tokens from Supabase table `push_tokens`
 */
async function removeInvalidToken(token) {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token);

    if (error) {
      console.error(`[PushService] Failed to remove invalid token ${token}:`, error.message);
    } else {
      console.log(`[PushService] Cleaned invalid/unregistered token ${token} from database`);
    }
  } catch (e) {
    console.error(`[PushService] Exception deleting token ${token}:`, e);
  }
}

/**
 * Send Push Notification to a user across all their registered devices.
 * Handles ticket errors (like DeviceNotRegistered) immediately and returns receipt IDs.
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // 1. Fetch valid push tokens for user from Supabase
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, device_type')
      .eq('user_id', userId);

    if (error) {
      console.error(`[PushService] Database error fetching tokens for user ${userId}:`, error.message);
      return { success: false, error: error.message };
    }

    if (!tokens || tokens.length === 0) {
      console.log(`[PushService] No push tokens found for user ${userId}`);
      return { success: false, message: 'No registered push tokens found for user.' };
    }

    // 2. Validate tokens with Expo
    const messages = [];
    const tokenMap = new Map(); // Maps push token to device metadata

    for (const record of tokens) {
      const token = record.token;
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`[PushService] Token ${token} is not a valid Expo push token. Cleaning...`);
        await removeInvalidToken(token);
        continue;
      }

      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      });
      tokenMap.set(token, record);
    }

    if (messages.length === 0) {
      return { success: false, message: 'No valid Expo push tokens to send.' };
    }

    // 3. Chunk and send notifications via Expo Server SDK
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const receiptIds = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // Process immediate ticket errors
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          const message = chunk[i];

          if (ticket.status === 'ok') {
            if (ticket.id) {
              receiptIds.push(ticket.id);
            }
          } else if (ticket.status === 'error') {
            console.error(`[PushService] Notification ticket error for token ${message.to}:`, ticket.message);
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
              console.warn(`[PushService] DeviceNotRegistered error on ticket for token ${message.to}. Removing token...`);
              await removeInvalidToken(message.to);
            }
          }
        }
      } catch (chunkError) {
        console.error('[PushService] Error sending chunk:', chunkError);
      }
    }

    console.log(`[PushService] Sent ${messages.length} notification(s) to user ${userId}. Receipts generated: ${receiptIds.length}`);

    return {
      success: true,
      sentCount: messages.length,
      receiptIds,
      tickets,
    };
  } catch (err) {
    console.error('[PushService] Fatal error sending push notification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check delivery receipts from Expo after a delay (e.g. 15 mins) and prune invalid tokens
 */
async function checkPushReceipts(receiptIds) {
  if (!receiptIds || receiptIds.length === 0) {
    return { success: true, message: 'No receipt IDs provided.' };
  }

  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    const cleanedTokens = [];

    for (const chunk of receiptIdChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'ok') {
          continue;
        } else if (receipt.status === 'error') {
          console.error(`[PushService] Receipt ${receiptId} reported error:`, receipt.message);

          if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
            // Note: IfExpo payload included token in custom data, we can prune directly
            console.warn(`[PushService] DeviceNotRegistered found in receipt ${receiptId}`);
            cleanedTokens.push(receiptId);
          }
        }
      }
    }

    return {
      success: true,
      checkedCount: receiptIds.length,
      cleanedReceipts: cleanedTokens,
    };
  } catch (err) {
    console.error('[PushService] Error checking push receipts:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPushNotification,
  checkPushReceipts,
  removeInvalidToken,
};
