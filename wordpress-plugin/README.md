# iRepair Headless Checkout Bridge (WordPress Mini-Plugin)

This small, self-contained WordPress plugin connects your React storefront directly to WooCommerce Hosted Checkout and the official **WooCommerce Stripe Payment Gateway** plugin (`woocommerce-gateway-stripe`).

## Installation Steps
1. Zip or upload `irepair-headless-checkout-bridge.php` into `/wp-content/plugins/irepair-headless-checkout-bridge/irepair-headless-checkout-bridge.php` (or zip the file and upload via **WordPress Admin → Plugins → Add New → Upload Plugin**).
2. Activate **iRepair Headless Checkout Bridge**.
3. Go to **WordPress Admin → Settings → iRepair Bridge**.
4. Copy your **React Backend API URL** and **Shared Handoff Secret** from your React Dashboard → **Payments** settings screen and paste them in.
5. Set **React Storefront Return URL** (if different from the backend API URL) and save.
6. Return to the React Dashboard → **Payments** screen and click **Test Configuration** to run all 8 live verification checks.

## What This Plugin Does
- Listens for `?irepair_handoff={single_use_token}` with IP rate-limiting.
- Verifies the token server-to-server against your React backend using `HMAC-SHA256` (`X-iRepair-Timestamp` + `X-iRepair-Signature`), populates the WooCommerce cart accurately (including product variations and coupons), and redirects to `/checkout/`.
- Enforces **Stripe ONLY** (Credit/Debit Card, Apple Pay, Google Pay) on checkout and `order-pay` — removing PayPal, Bank Transfer, Cash on Delivery, Klarna, Clearpay, and Link.
- Redirects completed orders back to `{React Storefront}/order-confirmation/{order_id}/?key={order_key}` and cancelled orders back to `{React Storefront}/cart/?payment_cancelled=1`.
- Marks WooCommerce cart, checkout, and order-pay pages `noindex, nofollow`.
