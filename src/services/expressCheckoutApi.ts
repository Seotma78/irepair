/**
 * Express Checkout Client API Service
 * Delegates cleanly to the unified WooCommerce Hosted / Dev-Simulated Payment API (/api/payments).
 */
import {
  fetchPaymentConfig,
  fetchVerifiedOrder,
  PublicPaymentConfig,
} from './paymentApi';

export interface ExpressCheckoutConfig extends PublicPaymentConfig {
  enabled: boolean;
}

export async function fetchExpressCheckoutConfig(forceRefresh = false): Promise<ExpressCheckoutConfig | null> {
  const cfg = await fetchPaymentConfig(forceRefresh);
  if (!cfg) return null;
  return {
    ...cfg,
    enabled: cfg.useWooHosted || cfg.isSimulatedMode,
  };
}

export async function pollOrderStatus(orderId: number | string, orderKey?: string) {
  const { order } = await fetchVerifiedOrder(orderId, orderKey);
  return {
    status: order.status,
    isPaid: order.isPaid,
    total: order.total,
    paymentMethod: order.paymentMethodTitle,
    dateCreated: order.dateCreated,
    order,
  };
}
