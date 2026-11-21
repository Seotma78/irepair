<?php
/**
 * Plugin Name: iRepair Headless Checkout Bridge
 * Description: Securely connects the headless iRepair Mobiles React storefront to WooCommerce hosted Checkout and the official WooCommerce Stripe Payment Gateway (Card, Apple Pay, Google Pay only).
 * Version: 1.1.0
 * Author: iRepair Mobiles UK
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * WC requires at least: 7.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class IRepair_Headless_Checkout_Bridge {
    const VERSION = '1.1.0';
    const OPTION_GROUP = 'irepair_bridge_options_group';
    const OPTION_NAME  = 'irepair_bridge_settings';

    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Admin settings menu
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // Handoff listener (?irepair_handoff=...) & headers
        add_action('template_redirect', array($this, 'handle_checkout_handoff'), 1);
        add_action('send_headers', array($this, 'send_noindex_and_security_headers'));
        add_action('wp_head', array($this, 'render_noindex_meta'), 1);
        add_filter('wp_robots', array($this, 'filter_wp_robots'));

        // Redirect URLs back to React storefront
        add_filter('woocommerce_get_return_url', array($this, 'filter_return_url'), 99, 2);
        add_filter('woocommerce_get_cancel_order_url', array($this, 'filter_cancel_url'), 99, 1);
        add_filter('woocommerce_get_cancel_order_url_raw', array($this, 'filter_cancel_url'), 99, 1);
        add_filter('allowed_redirect_hosts', array($this, 'allow_react_redirect_host'), 10, 1);

        // Strict Payment Method Enforcement: Official WooCommerce Stripe ONLY (Card, Apple Pay, Google Pay)
        add_filter('woocommerce_available_payment_gateways', array($this, 'restrict_payment_gateways'), 999);
        add_filter('wc_stripe_upe_params', array($this, 'filter_stripe_upe_params'), 999);
        add_filter('wc_stripe_available_payment_methods', array($this, 'filter_stripe_methods_list'), 999);
        add_filter('woocommerce_stripe_payment_methods', array($this, 'filter_stripe_methods_list'), 999);

        // Minimal hosted checkout styling & header bar
        add_action('wp_head', array($this, 'render_hosted_checkout_styles'), 99);
        add_action('wp_body_open', array($this, 'render_hosted_checkout_header'), 5);

        // REST API endpoints (/wp-json/irepair-bridge/v1/...)
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function get_settings() {
        $defaults = array(
            'backend_api_url'      => '',
            'react_storefront_url' => '',
            'handoff_secret'       => '',
            'clean_checkout_ui'    => '1',
            'logo_url'             => '',
            'store_label'          => 'iRepair Mobiles Secure Checkout',
        );
        $saved = get_option(self::OPTION_NAME, array());
        if (!is_array($saved)) {
            $saved = array();
        }
        $merged = wp_parse_args($saved, $defaults);
        $merged['backend_api_url']      = untrailingslashit(trim($merged['backend_api_url']));
        $merged['react_storefront_url'] = untrailingslashit(trim($merged['react_storefront_url']));
        $merged['handoff_secret']       = trim($merged['handoff_secret']);
        return $merged;
    }

    private function get_react_base_url() {
        $s = $this->get_settings();
        if (!empty($s['react_storefront_url'])) {
            return $s['react_storefront_url'];
        }
        if (!empty($s['backend_api_url'])) {
            return $s['backend_api_url'];
        }
        return untrailingslashit(home_url());
    }

    /* -------------------------------------------------------------------------
     * ADMIN SETTINGS PAGE (Settings > iRepair Bridge)
     * ---------------------------------------------------------------------- */
    public function register_admin_menu() {
        add_options_page(
            'iRepair Checkout Bridge',
            'iRepair Bridge',
            'manage_options',
            'irepair-bridge',
            array($this, 'render_admin_page')
        );
    }

    public function register_settings() {
        register_setting(self::OPTION_GROUP, self::OPTION_NAME, array($this, 'sanitize_settings'));
    }

    public function sanitize_settings($input) {
        $out = array();
        $out['backend_api_url']      = isset($input['backend_api_url']) ? esc_url_raw(untrailingslashit(trim($input['backend_api_url']))) : '';
        $out['react_storefront_url'] = isset($input['react_storefront_url']) ? esc_url_raw(untrailingslashit(trim($input['react_storefront_url']))) : '';
        $out['handoff_secret']       = isset($input['handoff_secret']) ? sanitize_text_field(trim($input['handoff_secret'])) : '';
        $out['clean_checkout_ui']    = !empty($input['clean_checkout_ui']) ? '1' : '0';
        $out['logo_url']             = isset($input['logo_url']) ? esc_url_raw(trim($input['logo_url'])) : '';
        $out['store_label']          = isset($input['store_label']) ? sanitize_text_field(trim($input['store_label'])) : 'iRepair Mobiles Secure Checkout';
        return $out;
    }

    public function render_admin_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        $s = $this->get_settings();
        ?>
        <div class="wrap">
            <h1>iRepair Headless Checkout Bridge (v<?php echo esc_html(self::VERSION); ?>)</h1>
            <p>Connects your React storefront directly to WooCommerce Hosted Checkout &amp; the official <strong>WooCommerce Stripe Payment Gateway</strong>.</p>
            <form method="post" action="options.php" style="max-width:760px;background:#fff;padding:24px;border:1px solid #ccd0d4;border-radius:8px;margin-top:16px;">
                <?php settings_fields(self::OPTION_GROUP); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="irepair_backend_api_url">React Backend API URL</label></th>
                        <td>
                            <input type="url" id="irepair_backend_api_url" name="<?php echo esc_attr(self::OPTION_NAME); ?>[backend_api_url]" value="<?php echo esc_attr($s['backend_api_url']); ?>" class="regular-text" placeholder="https://shop.irepair-mobiles.co.uk" required />
                            <p class="description">The public HTTPS URL of your Node/Express backend hosting the React storefront (no trailing slash).</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="irepair_react_url">React Storefront Return URL</label></th>
                        <td>
                            <input type="url" id="irepair_react_url" name="<?php echo esc_attr(self::OPTION_NAME); ?>[react_storefront_url]" value="<?php echo esc_attr($s['react_storefront_url']); ?>" class="regular-text" placeholder="https://irepair-mobiles.co.uk" />
                            <p class="description">Base URL used when redirecting customers back to <code>/order-confirmation/...</code> or <code>/cart/?payment_cancelled=1</code>. Defaults to React Backend URL if blank.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="irepair_handoff_secret">Shared Handoff Secret</label></th>
                        <td>
                            <input type="text" id="irepair_handoff_secret" name="<?php echo esc_attr(self::OPTION_NAME); ?>[handoff_secret]" value="<?php echo esc_attr($s['handoff_secret']); ?>" class="regular-text code" autocomplete="off" required />
                            <p class="description">Must match the exact Handoff Secret shown in your React Dashboard &rarr; <strong>Settings &rarr; Payments</strong>.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="irepair_clean_ui">Minimal Hosted Checkout Bar</label></th>
                        <td>
                            <label>
                                <input type="checkbox" id="irepair_clean_ui" name="<?php echo esc_attr(self::OPTION_NAME); ?>[clean_checkout_ui]" value="1" <?php checked($s['clean_checkout_ui'], '1'); ?> />
                                Display a clean minimal checkout header ("Back to Shop" link) and hide WordPress storefront navigation/footer clutter on Checkout &amp; Order-Pay pages.
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="irepair_logo_url">Checkout Header Logo URL (optional)</label></th>
                        <td>
                            <input type="url" id="irepair_logo_url" name="<?php echo esc_attr(self::OPTION_NAME); ?>[logo_url]" value="<?php echo esc_attr($s['logo_url']); ?>" class="regular-text" placeholder="https://irepair-mobiles.co.uk/assets/logo.svg" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="irepair_store_label">Checkout Header Title</label></th>
                        <td>
                            <input type="text" id="irepair_store_label" name="<?php echo esc_attr(self::OPTION_NAME); ?>[store_label]" value="<?php echo esc_attr($s['store_label']); ?>" class="regular-text" />
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Bridge Settings'); ?>
            </form>
        </div>
        <?php
    }

    /* -------------------------------------------------------------------------
     * HMAC SIGNING & VERIFICATION
     * ---------------------------------------------------------------------- */
    private function sign_payload($secret, $timestamp, $raw_body) {
        return hash_hmac('sha256', $timestamp . '.' . $raw_body, $secret);
    }

    private function verify_hmac_request(WP_REST_Request $request) {
        $s = $this->get_settings();
        $secret = $s['handoff_secret'];
        if (empty($secret)) {
            return new WP_Error('irepair_no_secret', 'Handoff secret is not configured in WordPress Settings > iRepair Bridge.', array('status' => 403));
        }

        $ts  = $request->get_header('x-irepair-timestamp');
        $sig = $request->get_header('x-irepair-signature');
        if (empty($ts) || empty($sig)) {
            return new WP_Error('irepair_missing_sig', 'Missing HMAC headers.', array('status' => 401));
        }

        $ts_int = intval($ts);
        if (abs(time() - $ts_int) > 300) {
            return new WP_Error('irepair_expired_ts', 'HMAC timestamp expired.', array('status' => 401));
        }

        $raw_body = $request->get_body();
        if (!is_string($raw_body)) {
            $raw_body = '';
        }

        $expected = $this->sign_payload($secret, strval($ts), $raw_body);
        $clean_sig = strtolower(preg_replace('/^sha256=/i', '', trim($sig)));

        if (!hash_equals($expected, $clean_sig)) {
            return new WP_Error('irepair_bad_sig', 'HMAC signature mismatch.', array('status' => 403));
        }

        return true;
    }

    /* -------------------------------------------------------------------------
     * RATE LIMITING & SIGNED CHECKOUT HANDOFF (?irepair_handoff={token})
     * ---------------------------------------------------------------------- */
    private function check_ip_rate_limit() {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
        $key = 'irep_hl_' . md5($ip);
        $count = intval(get_transient($key));
        if ($count >= 25) {
            return false;
        }
        set_transient($key, $count + 1, MINUTE_IN_SECONDS);
        return true;
    }

    public function handle_checkout_handoff() {
        if (!isset($_GET['irepair_handoff'])) {
            return;
        }

        $react_url = $this->get_react_base_url();
        $cancel_fallback = $react_url . '/cart/?payment_cancelled=1';

        if (!$this->check_ip_rate_limit()) {
            wp_redirect(add_query_arg('checkout_error', rawurlencode('Too many checkout attempts. Please wait a minute.'), $cancel_fallback));
            exit;
        }

        if (!function_exists('WC') || !WC()) {
            wp_redirect(add_query_arg('checkout_error', rawurlencode('WooCommerce is inactive on WordPress.'), $cancel_fallback));
            exit;
        }

        $token = sanitize_text_field(wp_unslash($_GET['irepair_handoff']));
        $s = $this->get_settings();
        if (empty($s['handoff_secret'])) {
            wp_redirect(add_query_arg('checkout_error', rawurlencode('WordPress Bridge Handoff Secret is not configured.'), $cancel_fallback));
            exit;
        }

        $data = null;

        // Mode A: Self-contained stateless HMAC-SHA256 handoff token (irep2_<base64url>.<hex_sig>)
        if (strpos($token, 'irep2_') === 0) {
            $raw_part = substr($token, 6);
            $parts = explode('.', $raw_part, 2);
            if (count($parts) !== 2 || empty($parts[0]) || empty($parts[1])) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('Invalid checkout handoff signature format.'), $cancel_fallback));
                exit;
            }
            list($encoded_payload, $provided_sig) = $parts;
            $expected_sig = hash_hmac('sha256', $encoded_payload, $s['handoff_secret']);
            if (!hash_equals($expected_sig, strtolower(trim($provided_sig)))) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('Checkout handoff signature verification failed.'), $cancel_fallback));
                exit;
            }
            $b64 = strtr($encoded_payload, '-_', '+/');
            $pad = strlen($b64) % 4;
            if ($pad > 0) {
                $b64 .= str_repeat('=', 4 - $pad);
            }
            $decoded = json_decode(base64_decode($b64), true);
            if (!is_array($decoded) || empty($decoded['items']) || !is_array($decoded['items'])) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('Malformed checkout handoff payload.'), $cancel_fallback));
                exit;
            }
            if (empty($decoded['exp']) || time() > intval($decoded['exp'])) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('Checkout session has expired. Please return to shop and try again.'), $cancel_fallback));
                exit;
            }
            $hid = !empty($decoded['hid']) ? sanitize_key($decoded['hid']) : md5($encoded_payload);
            $replay_key = 'irep2_used_' . $hid;
            if (get_transient($replay_key)) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('This checkout session has already been used.'), $cancel_fallback));
                exit;
            }
            set_transient($replay_key, '1', 20 * MINUTE_IN_SECONDS);

            $data = array(
                'valid'          => true,
                'handoffId'      => $hid,
                'source'         => $decoded['src'] ?? 'product',
                'couponCode'     => $decoded['coupon'] ?? null,
                'returnUrl'      => $decoded['ret'] ?? '',
                'cancelUrl'      => $decoded['can'] ?? '',
                'allowedMethods' => $decoded['methods'] ?? array('card', 'apple_pay', 'google_pay'),
                'items'          => $decoded['items'],
            );
        } else {
            // Mode B: Server-to-server callback verification (irep_<hex>)
            if (empty($token) || !preg_match('/^irep_[a-f0-9]{16,128}$/', $token)) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('Invalid checkout handoff token.'), $cancel_fallback));
                exit;
            }
            if (empty($s['backend_api_url'])) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('WordPress Bridge Backend API URL is not configured.'), $cancel_fallback));
                exit;
            }

            $verify_endpoint = $s['backend_api_url'] . '/api/payments/handoff/verify';
            $body_str = wp_json_encode(array('token' => $token), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $ts = strval(time());
            $sig = $this->sign_payload($s['handoff_secret'], $ts, $body_str);

            $response = wp_remote_post($verify_endpoint, array(
                'timeout' => 15,
                'headers' => array(
                    'Content-Type'        => 'application/json',
                    'Accept'              => 'application/json',
                    'X-iRepair-Timestamp' => $ts,
                    'X-iRepair-Signature' => $sig,
                ),
                'body' => $body_str,
            ));

            if (is_wp_error($response)) {
                wp_redirect(add_query_arg('checkout_error', rawurlencode('Could not verify checkout session: ' . $response->get_error_message()), $cancel_fallback));
                exit;
            }

            $code = wp_remote_retrieve_response_code($response);
            $data = json_decode(wp_remote_retrieve_body($response), true);

            if ($code !== 200 || empty($data['valid']) || empty($data['items']) || !is_array($data['items'])) {
                $err_msg = !empty($data['error']) ? $data['error'] : 'Checkout session expired or already used.';
                wp_redirect(add_query_arg('checkout_error', rawurlencode($err_msg), $cancel_fallback));
                exit;
            }
        }

        // Ensure WooCommerce session & cart are initialized
        if (null === WC()->session) {
            WC()->initialize_session();
        }
        if (null === WC()->cart) {
            wc_load_cart();
        }
        WC()->session->set_customer_session_cookie(true);
        WC()->cart->empty_cart();

        $added_any = false;
        foreach ($data['items'] as $item) {
            $product_id   = isset($item['product_id']) ? absint($item['product_id']) : 0;
            $variation_id = isset($item['variation_id']) ? absint($item['variation_id']) : 0;
            $qty          = isset($item['quantity']) ? max(1, absint($item['quantity'])) : 1;
            $variation    = array();

            if (!empty($item['variation']) && is_array($item['variation'])) {
                foreach ($item['variation'] as $k => $v) {
                    $attr_key = sanitize_key($k);
                    if (strpos($attr_key, 'attribute_') !== 0) {
                        $attr_key = 'attribute_' . $attr_key;
                    }
                    $variation[$attr_key] = sanitize_text_field(strval($v));
                }
            }

            if ($product_id > 0) {
                $cart_key = WC()->cart->add_to_cart($product_id, $qty, $variation_id, $variation);
                if ($cart_key) {
                    $added_any = true;
                }
            }
        }

        if (!$added_any) {
            $err_target = !empty($data['cancelUrl']) ? $data['cancelUrl'] : $cancel_fallback;
            wp_redirect(add_query_arg('checkout_error', rawurlencode('Selected item(s) could not be added to WooCommerce cart.'), $err_target));
            exit;
        }

        if (!empty($data['couponCode'])) {
            $coupon = sanitize_text_field($data['couponCode']);
            if (!WC()->cart->has_discount($coupon)) {
                WC()->cart->apply_coupon($coupon);
            }
        }

        // Save handoff return/cancel & allowed methods into WC session
        WC()->session->set('irepair_headless_checkout', '1');
        WC()->session->set('irepair_handoff_id', sanitize_text_field($data['handoffId'] ?? ''));
        if (!empty($data['returnUrl'])) {
            WC()->session->set('irepair_return_url', esc_url_raw($data['returnUrl']));
        }
        if (!empty($data['cancelUrl'])) {
            WC()->session->set('irepair_cancel_url', esc_url_raw($data['cancelUrl']));
        }
        if (!empty($data['allowedMethods']) && is_array($data['allowedMethods'])) {
            WC()->session->set('irepair_allowed_methods', array_map('sanitize_key', $data['allowedMethods']));
        }

        WC()->cart->calculate_totals();
        WC()->cart->set_session();

        wp_safe_redirect(wc_get_checkout_url());
        exit;
    }

    /* -------------------------------------------------------------------------
     * RETURN & CANCEL REDIRECT FILTERS + NOINDEX PROTECTION
     * ---------------------------------------------------------------------- */
    public function allow_react_redirect_host($hosts) {
        $react = $this->get_react_base_url();
        $parsed = wp_parse_url($react);
        if (!empty($parsed['host'])) {
            $hosts[] = $parsed['host'];
        }
        $s = $this->get_settings();
        if (!empty($s['backend_api_url'])) {
            $p2 = wp_parse_url($s['backend_api_url']);
            if (!empty($p2['host'])) {
                $hosts[] = $p2['host'];
            }
        }
        return array_unique($hosts);
    }

    public function filter_return_url($return_url, $order) {
        if (!$order || !is_a($order, 'WC_Order')) {
            return $return_url;
        }
        $react_url = $this->get_react_base_url();
        if (function_exists('WC') && WC()->session) {
            $sess_return = WC()->session->get('irepair_return_url');
            if (!empty($sess_return)) {
                $react_base = untrailingslashit(preg_replace('#/order-confirmation/?$#', '', $sess_return));
                if (!empty($react_base)) {
                    $react_url = $react_base;
                }
            }
        }
        if (empty($react_url) || untrailingslashit($react_url) === untrailingslashit(home_url())) {
            return $return_url;
        }

        $order_id  = $order->get_id();
        $order_key = $order->get_order_key();
        return trailingslashit($react_url) . 'order-confirmation/' . $order_id . '/?key=' . rawurlencode($order_key);
    }

    public function filter_cancel_url($cancel_url) {
        $react_url = $this->get_react_base_url();
        if (function_exists('WC') && WC()->session) {
            $sess_cancel = WC()->session->get('irepair_cancel_url');
            if (!empty($sess_cancel)) {
                return $sess_cancel;
            }
        }
        if (empty($react_url) || untrailingslashit($react_url) === untrailingslashit(home_url())) {
            return $cancel_url;
        }
        return trailingslashit($react_url) . 'cart/?payment_cancelled=1';
    }

    private function is_wc_payment_surface() {
        if (!function_exists('is_checkout')) {
            return false;
        }
        return is_checkout() || is_cart() || is_wc_endpoint_url('order-pay') || is_wc_endpoint_url('order-received');
    }

    public function send_noindex_and_security_headers() {
        if ($this->is_wc_payment_surface() && !headers_sent()) {
            header('X-Robots-Tag: noindex, nofollow', true);
        }
    }

    public function render_noindex_meta() {
        if ($this->is_wc_payment_surface()) {
            echo "\n<meta name=\"robots\" content=\"noindex, nofollow\" />\n";
        }
    }

    public function filter_wp_robots($robots) {
        if ($this->is_wc_payment_surface()) {
            $robots['noindex']  = true;
            $robots['nofollow'] = true;
        }
        return $robots;
    }

    /* -------------------------------------------------------------------------
     * STRICT GATEWAY ENFORCEMENT: OFFICIAL STRIPE ONLY (Card, Apple Pay, Google Pay)
     * ---------------------------------------------------------------------- */
    public function restrict_payment_gateways($gateways) {
        if (is_admin() && !wp_doing_ajax()) {
            return $gateways;
        }
        if (!is_array($gateways)) {
            return $gateways;
        }
        // Only allow primary official Stripe gateway ('stripe'). Block BACS, COD, Cheque, PayPal, Klarna, Clearpay, Link sub-gateways.
        if (isset($gateways['stripe'])) {
            return array('stripe' => $gateways['stripe']);
        }
        return array();
    }

    public function filter_stripe_methods_list($methods) {
        if (!is_array($methods)) {
            return $methods;
        }
        $strict = array('card', 'apple_pay', 'google_pay');
        $filtered = array();
        foreach ($methods as $key => $val) {
            if (is_string($key) && in_array($key, $strict, true)) {
                $filtered[$key] = $val;
            } elseif (is_string($val) && in_array($val, $strict, true)) {
                $filtered[] = $val;
            }
        }
        return !empty($filtered) ? $filtered : $methods;
    }

    public function filter_stripe_upe_params($params) {
        if (!is_array($params)) {
            return $params;
        }
        $allowed = array('card', 'apple_pay', 'google_pay');
        if (function_exists('WC') && WC()->session) {
            $sess_allowed = WC()->session->get('irepair_allowed_methods');
            if (is_array($sess_allowed) && !empty($sess_allowed)) {
                $allowed = array_values(array_intersect($allowed, $sess_allowed));
            }
        }

        // Remove Link, Klarna, Afterpay/Clearpay, SEPA, etc. from UPE configuration
        if (isset($params['paymentMethodsConfig']) && is_array($params['paymentMethodsConfig'])) {
            foreach (array_keys($params['paymentMethodsConfig']) as $pm_id) {
                if (!in_array($pm_id, array('card'), true)) {
                    unset($params['paymentMethodsConfig'][$pm_id]);
                }
            }
        }
        if (isset($params['isLinkEnabled'])) {
            $params['isLinkEnabled'] = false;
        }
        if (isset($params['isApplePayEnabled'])) {
            $params['isApplePayEnabled'] = in_array('apple_pay', $allowed, true);
        }
        if (isset($params['isGooglePayEnabled'])) {
            $params['isGooglePayEnabled'] = in_array('google_pay', $allowed, true);
        }
        return $params;
    }

    /* -------------------------------------------------------------------------
     * MINIMAL HOSTED CHECKOUT UI (Clean Bar + Hide WP Clutter)
     * ---------------------------------------------------------------------- */
    public function render_hosted_checkout_styles() {
        $s = $this->get_settings();
        if ($s['clean_checkout_ui'] !== '1') {
            return;
        }
        if (!function_exists('is_checkout') || (!is_checkout() && !is_wc_endpoint_url('order-pay'))) {
            return;
        }
        ?>
        <style id="irepair-clean-hosted-checkout">
            header.site-header, #masthead, .site-footer, #colophon, nav.main-navigation, .woocommerce-breadcrumb, #secondary {
                display: none !important;
            }
            .irepair-hosted-bar {
                background: #0f172a;
                color: #ffffff;
                padding: 14px 20px;
                border-bottom: 3px solid #DF0C88;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .irepair-hosted-bar-inner {
                max-width: 1120px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
            }
            .irepair-hosted-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 700;
                font-size: 15px;
            }
            .irepair-hosted-brand img {
                height: 28px;
                width: auto;
            }
            .irepair-hosted-back {
                color: #f8fafc;
                text-decoration: none;
                font-size: 13px;
                font-weight: 600;
                padding: 7px 14px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.22);
                background: rgba(255,255,255,0.08);
            }
            .irepair-hosted-back:hover {
                background: #DF0C88;
                border-color: #DF0C88;
                color: #fff;
            }
        </style>
        <?php
    }

    public function render_hosted_checkout_header() {
        $s = $this->get_settings();
        if ($s['clean_checkout_ui'] !== '1') {
            return;
        }
        if (!function_exists('is_checkout') || (!is_checkout() && !is_wc_endpoint_url('order-pay'))) {
            return;
        }
        $back_url = trailingslashit($this->get_react_base_url()) . 'cart/?payment_cancelled=1';
        ?>
        <div class="irepair-hosted-bar">
            <div class="irepair-hosted-bar-inner">
                <div class="irepair-hosted-brand">
                    <?php if (!empty($s['logo_url'])) : ?>
                        <img src="<?php echo esc_url($s['logo_url']); ?>" alt="iRepair Mobiles" />
                    <?php endif; ?>
                    <span>&#x1F512; <?php echo esc_html($s['store_label']); ?></span>
                </div>
                <a class="irepair-hosted-back" href="<?php echo esc_url($back_url); ?>">&larr; Back to Shop</a>
            </div>
        </div>
        <?php
    }

    /* -------------------------------------------------------------------------
     * REST API ENDPOINTS (/wp-json/irepair-bridge/v1/...)
     * ---------------------------------------------------------------------- */
    public function register_rest_routes() {
        register_rest_route('irepair-bridge/v1', '/health', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_health'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('irepair-bridge/v1', '/test-handoff', array(
            'methods'             => 'POST',
            'callback'            => array($this, 'rest_test_handoff'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('irepair-bridge/v1', '/order/(?P<id>\d+)', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_get_order'),
            'permission_callback' => '__return_true',
        ));
    }

    public function rest_health(WP_REST_Request $request) {
        $auth = $this->verify_hmac_request($request);
        $sig_valid = !is_wp_error($auth);
        if (!$sig_valid) {
            return new WP_REST_Response(array(
                'plugin'          => 'irepair-headless-checkout-bridge',
                'version'         => self::VERSION,
                'signature_valid' => false,
                'error'           => $auth->get_error_message(),
            ), $auth->get_error_data()['status'] ?? 403);
        }

        $s = $this->get_settings();
        $stripe_settings = get_option('woocommerce_stripe_settings', array());
        $stripe_enabled  = !empty($stripe_settings['enabled']) && $stripe_settings['enabled'] === 'yes';
        $stripe_testmode = !empty($stripe_settings['testmode']) && $stripe_settings['testmode'] === 'yes';

        // Inspect webhook secret (test vs live)
        $wh_secret = $stripe_testmode
            ? ($stripe_settings['test_webhook_secret'] ?? '')
            : ($stripe_settings['webhook_secret'] ?? '');

        // Inspect UPE / express checkout methods configured in Stripe plugin
        $upe_methods = array();
        if (!empty($stripe_settings['upe_checkout_experience_accepted_payments']) && is_array($stripe_settings['upe_checkout_experience_accepted_payments'])) {
            $upe_methods = $stripe_settings['upe_checkout_experience_accepted_payments'];
        } else {
            $upe_methods = array('card');
        }
        if (!empty($stripe_settings['payment_request']) && $stripe_settings['payment_request'] === 'yes') {
            $upe_methods[] = 'apple_pay';
            $upe_methods[] = 'google_pay';
        }
        if (!empty($stripe_settings['upe_checkout_experience_accepted_payments']) && in_array('link', $stripe_settings['upe_checkout_experience_accepted_payments'], true)) {
            $upe_methods[] = 'link';
        }

        return new WP_REST_Response(array(
            'plugin'                     => 'irepair-headless-checkout-bridge',
            'version'                    => self::VERSION,
            'signature_valid'            => true,
            'supports_stateless_handoff' => true,
            'wc_version'                 => function_exists('WC') && WC() ? WC()->version : 'missing',
            'stripe_enabled'             => $stripe_enabled,
            'stripe_testmode'            => $stripe_testmode,
            'stripe_mode_label'          => $stripe_testmode ? 'test' : 'live',
            'stripe_webhook_configured'  => !empty($wh_secret),
            'upe_enabled_methods'        => array_values(array_unique($upe_methods)),
            'react_url'                  => $this->get_react_base_url(),
            'checkout_url'               => function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : '',
        ), 200);
    }

    public function rest_test_handoff(WP_REST_Request $request) {
        $auth = $this->verify_hmac_request($request);
        if (is_wp_error($auth)) {
            return $auth;
        }
        return new WP_REST_Response(array(
            'ok'           => true,
            'message'      => 'Signed dry-run verified. WooCommerce cart session & Stripe checkout URL ready.',
            'checkout_url' => function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : '',
            'react_url'    => $this->get_react_base_url(),
        ), 200);
    }

    public function rest_get_order(WP_REST_Request $request) {
        $order_id = absint($request['id']);
        $key      = sanitize_text_field($request->get_param('key') ?: '');

        $hmac_check = $this->verify_hmac_request($request);
        $has_hmac   = !is_wp_error($hmac_check);

        if (!$has_hmac && empty($key)) {
            return new WP_Error('irepair_forbidden', 'Missing order key or HMAC signature.', array('status' => 403));
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('irepair_not_found', 'Order not found.', array('status' => 404));
        }

        if (!$has_hmac && $order->get_order_key() !== $key) {
            return new WP_Error('irepair_bad_key', 'Invalid order key.', array('status' => 403));
        }

        return new WP_REST_Response(array(
            'id'                   => $order->get_id(),
            'number'               => $order->get_order_number(),
            'status'               => $order->get_status(),
            'total'                => $order->get_total(),
            'currency'             => $order->get_currency(),
            'payment_method'       => $order->get_payment_method(),
            'payment_method_title' => $order->get_payment_method_title(),
            'date_created'         => $order->get_date_created() ? $order->get_date_created()->date('c') : '',
        ), 200);
    }
}

IRepair_Headless_Checkout_Bridge::instance();
