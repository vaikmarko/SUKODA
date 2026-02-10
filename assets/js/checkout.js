/**
 * SUKODA Stripe Checkout Integration
 * 
 * Handles payment flow for both gifts and subscriptions
 */

// API endpoint (Firebase Cloud Functions)
const API_BASE = '/api';

/**
 * Create checkout session and redirect to Stripe
 */
async function createCheckout(orderData) {
  try {
    // Attach UTM tracking data if available
    if (window.SUKODA_TRACKING) {
      const utm = SUKODA_TRACKING.getUTM();
      const landingPage = SUKODA_TRACKING.getLandingPage();
      if (Object.keys(utm).length > 0 || landingPage) {
        orderData.tracking = {
          ...utm,
          landing_page: landingPage,
        };
      }
    }

    const response = await fetch(`${API_BASE}/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create checkout session';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Response is not JSON
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Redirect to Stripe Checkout
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL received');
    }

    return data;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}

/**
 * Start subscription checkout
 * Called from index.html
 */
async function startSubscriptionCheckout({
  rhythm,      // 'once', 'twice', 'weekly'
  size,        // 'small', 'medium', 'large', 'xlarge'
  customer,    // { name, email, phone, address }
  lang = 'et',
  promoCode,   // optional promo code (e.g. from follow-up email)
  referralCode, // optional referral code (e.g. from ?ref= URL param)
}) {
  const data = {
    type: 'subscription',
    packageType: rhythm,
    size: size,
    customer: customer,
    lang: lang,
  };
  // Pass referral code if provided (takes priority over promo)
  const ref = referralCode || new URLSearchParams(window.location.search).get('ref');
  if (ref) {
    data.referralCode = ref;
  }
  // Pass promo code if provided (from URL param or explicit)
  const promo = promoCode || new URLSearchParams(window.location.search).get('promo');
  if (promo && !ref) {
    data.promoCode = promo;
  }
  return createCheckout(data);
}

/**
 * Start gift checkout
 * Called from kingitus.html
 */
async function startGiftCheckout({
  giftType,        // 'moment', 'month', 'quarter'
  size,            // 'small', 'medium', 'large', 'xlarge'
  customer,        // { name, email, phone }
  recipient,       // { name, address, message }
  deliveryMethod,  // 'email' or 'post'
  lang = 'et',
  promoCode,       // optional promo code
}) {
  const data = {
    type: 'gift',
    packageType: giftType,
    size: size,
    customer: customer,
    recipient: recipient,
    deliveryMethod: deliveryMethod,
    lang: lang,
  };
  const promo = promoCode || new URLSearchParams(window.location.search).get('promo');
  if (promo) {
    data.promoCode = promo;
  }
  return createCheckout(data);
}

/**
 * Get order details (for success page)
 */
async function getOrderDetails(orderId) {
  try {
    const response = await fetch(`${API_BASE}/order?orderId=${orderId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get order details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

/**
 * Parse URL parameters
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    sessionId: params.get('session_id'),
    orderId: params.get('order_id'),
    size: params.get('size'),
    cancelled: params.get('cancelled') === 'true',
    promo: params.get('promo'),
    ref: params.get('ref'),
  };
}

// Export functions for use in HTML
window.SUKODA = {
  startSubscriptionCheckout,
  startGiftCheckout,
  getOrderDetails,
  getUrlParams,
};

