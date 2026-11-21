<?php
/**
 * Plugin Name: iRepair Mobiles - Headless WooCommerce Integration
 * Plugin URI: https://irepair-mobiles.co.uk
 * Description: Rewrites WooCommerce email links, password reset links, order tracking, and Store API endpoints to seamlessly point to the React storefront.
 * Version: 2.1.0
 * Author: iRepair Mobiles Engineering
 * Author URI: https://irepair-mobiles.co.uk
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Configure your frontend React URL.
 * You can also define REACT_FRONTEND_URL in your wp-config.php:
 * define('REACT_FRONTEND_URL', 'https://irepair-mobiles.co.uk');
 */
if (!defined('REACT_FRONTEND_URL')) {
    define('REACT_FRONTEND_URL', 'https://irepair-mobiles.co.uk');
}

/**
 * 1. REWRITE PASSWORD RESET URLS IN EMAILS
 * Directs the customer to the React storefront password reset page.
 */
add_filter('lostpassword_url', 'irepair_custom_lostpassword_url', 99, 2);
function irepair_custom_lostpassword_url($lostpassword_url, $redirect) {
    return rtrim(REACT_FRONTEND_URL, '/') . '/account?tab=forgot';
}

add_filter('retrieve_password_message', 'irepair_custom_reset_password_email_link', 99, 4);
function irepair_custom_reset_password_email_link($message, $key, $user_login, $user_data) {
    $reset_url = rtrim(REACT_FRONTEND_URL, '/') . '/account?tab=reset&key=' . rawurlencode($key) . '&login=' . rawurlencode($user_login);
    
    // Replace standard WordPress reset link with React frontend link
    $message = preg_replace(
        '/https?:\/\/[^\s]+action=rp[^\s]*/i',
        $reset_url,
        $message
    );

    return $message;
}

/**
 * 2. REWRITE WOOCOMMERCE EMAIL ORDER LINKS
 * Replaces "View order" links in Customer Completed, Processing, and Invoice emails.
 */
add_filter('woocommerce_email_order_items_args', 'irepair_custom_email_order_items_args', 99, 1);
function irepair_custom_email_order_items_args($args) {
    // Keep standard items formatting
    return $args;
}

add_filter('woocommerce_get_endpoint_url', 'irepair_custom_myaccount_endpoint_urls', 99, 4);
function irepair_custom_myaccount_endpoint_urls($url, $endpoint, $value, $permalink) {
    if ($endpoint === 'view-order' && !empty($value)) {
        return rtrim(REACT_FRONTEND_URL, '/') . '/account?tab=order-detail&orderId=' . intval($value);
    }
    if ($endpoint === 'orders') {
        return rtrim(REACT_FRONTEND_URL, '/') . '/account?tab=orders';
    }
    return $url;
}

/**
 * 3. REWRITE ORDER RECEIVED (THANK YOU) REDIRECT URL
 * If customer pays via WooCommerce hosted gateway, return them to React Order Confirmation.
 */
add_filter('woocommerce_get_return_url', 'irepair_custom_order_received_url', 99, 2);
function irepair_custom_order_received_url($return_url, $order) {
    if ($order && is_a($order, 'WC_Order')) {
        return rtrim(REACT_FRONTEND_URL, '/') . '/order-confirmation?id=' . $order->get_id();
    }
    return $return_url;
}

/**
 * 4. ALLOW STORE API / REST API CORS HEADERS
 * Ensures the API proxy or direct browser Cart-Token calls succeed smoothly.
 */
add_action('init', 'irepair_headless_cors_headers');
function irepair_headless_cors_headers() {
    $origin = get_http_origin();
    $allowed_origins = array(
        'https://irepair-mobiles.co.uk',
        'http://localhost:3000',
        'http://localhost:5173',
    );

    if ($origin && in_array($origin, $allowed_origins, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, Cart-Token, X-WC-Store-API-Nonce");
    }

    if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        status_header(200);
        exit();
    }
}

/**
 * 5. STORE API CART TOKEN SUPPORT
 * Ensure guest Cart-Token headers persist and sync correctly.
 */
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        header('Access-Control-Allow-Headers: Authorization, X-WP-Nonce, Content-Type, Cart-Token');
        return $value;
    });
});
