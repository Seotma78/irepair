import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getWooCommerceConfig } from '../services/wooCommerceService';
import { syncSingleProduct, isProductSyncInProgress } from '../services/productSyncService';
import { getDb } from '../db';

export const webhookRouter = Router();

/**
 * WooCommerce Webhook Endpoint: POST /api/webhooks/woocommerce
 * Verifies X-WC-Webhook-Signature (HMAC-SHA256)
 */
webhookRouter.post('/woocommerce', async (req: Request, res: Response): Promise<any> => {
  try {
    const topic = req.headers['x-wc-webhook-topic'] as string;
    const signature = req.headers['x-wc-webhook-signature'] as string;
    const deliveryId = req.headers['x-wc-webhook-delivery-id'] as string;
    const sourceUrl = req.headers['x-wc-webhook-source'] as string;

    const config = await getWooCommerceConfig();
    const webhookSecret = config.webhookSecret || 'wc_webhook_secret_irepair_2026';

    // Verify HMAC-SHA256 signature if signature header is provided
    if (signature) {
      const payloadString = JSON.stringify(req.body);
      const computedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString, 'utf8')
        .digest('base64');

      if (computedHash !== signature) {
        console.warn('Webhook signature mismatch! Rejecting request.');
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    console.log(`Received WooCommerce webhook: topic=${topic}, delivery=${deliveryId}`);

    // Ping check from WooCommerce when webhook is created
    if (req.body?.webhook_id || topic === 'webhook.ping') {
      return res.status(200).json({ success: true, message: 'Webhook registered successfully' });
    }

    const payload = req.body;
    const productId = payload?.id;

    if (!productId) {
      return res.status(200).json({ success: true, message: 'No product ID in payload' });
    }

    // Handle topic
    if (topic === 'product.created' || topic === 'product.updated' || topic === 'product.restored') {
      console.log(`Targeted sync for product ${productId} triggered by webhook`);
      // Run targeted sync in background so WooCommerce webhook caller receives instant 200 OK
      setTimeout(async () => {
        try {
          await syncSingleProduct(productId);
        } catch (err: any) {
          console.error(`Targeted product sync error for ${productId}:`, err.message);
        }
      }, 50);
    } else if (topic === 'product.deleted') {
      const db = await getDb();
      const deletedPolicy = config.deletedPolicy || 'archive';
      const now = new Date().toISOString();

      if (deletedPolicy === 'delete') {
        db.run('DELETE FROM products WHERE external_id = ?', [productId]);
        db.run('DELETE FROM product_variations WHERE external_parent_id = ?', [productId]);
        db.run('DELETE FROM product_images WHERE product_id LIKE ?', [`wp-${productId}%`]);
      } else {
        db.run("UPDATE products SET status = 'trash', is_deleted_remote = 1, updated_at = ? WHERE external_id = ?", [now, productId]);
      }
    }

    return res.status(200).json({ success: true, processed: true });
  } catch (err: any) {
    console.error('WooCommerce webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});
