/**
 * SUKODA Tracking & Analytics
 * Google Analytics (GA4) + Meta Pixel + UTM parameter capture + Conversion events
 * GDPR-compliant: All tracking loads ONLY after user consent
 */

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const META_PIXEL_ID = '2178046653021231';
    const GA_MEASUREMENT_ID = 'G-JTNKBBE98T';
    const pixelEnabled = META_PIXEL_ID && META_PIXEL_ID !== 'SINU_PIXEL_ID_SIIA';
    const gaEnabled = GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

    // ============================================================
    // CONSENT MANAGEMENT
    // ============================================================
    function hasConsent() {
        return document.cookie.split(';').some(function(c) {
            return c.trim().startsWith('sukoda_consent=accepted');
        });
    }

    function hasDeclined() {
        return document.cookie.split(';').some(function(c) {
            return c.trim().startsWith('sukoda_consent=declined');
        });
    }

    function hasResponded() {
        return hasConsent() || hasDeclined();
    }

    // ============================================================
    // GOOGLE ANALYTICS GA4 (loads only with consent)
    // ============================================================
    function initGA() {
        if (!gaEnabled || window._sukodaGAInitialized) return;

        // Load gtag.js script
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
        document.head.appendChild(script);

        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID, {
            send_page_view: true
        });

        window._sukodaGAInitialized = true;
    }

    // Helper: send GA4 event (safe — only fires if GA is initialized)
    function gaEvent(eventName, params) {
        if (!gaEnabled || !window._sukodaGAInitialized || !window.gtag) return;
        window.gtag('event', eventName, params || {});
    }

    // ============================================================
    // META PIXEL (loads only with consent)
    // ============================================================
    function initPixel() {
        if (!pixelEnabled || window._sukodaPixelInitialized) return;

        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', META_PIXEL_ID);
        fbq('track', 'PageView');
        window._sukodaPixelInitialized = true;
    }

    // ============================================================
    // INITIALIZE ALL TRACKING (consent-based)
    // ============================================================
    function initAllTracking() {
        initGA();
        initPixel();
    }

    // Auto-initialize if consent already given
    if (hasConsent()) {
        initAllTracking();
    }

    // ============================================================
    // UTM PARAMETER CAPTURE (no cookies, sessionStorage only)
    // ============================================================
    function captureUTM() {
        var params = new URLSearchParams(window.location.search);
        var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        var utm = {};
        var hasUTM = false;

        utmKeys.forEach(function(key) {
            var val = params.get(key);
            if (val) {
                utm[key] = val;
                hasUTM = true;
            }
        });

        var fbclid = params.get('fbclid');
        if (fbclid) {
            utm.fbclid = fbclid;
            hasUTM = true;
        }

        if (hasUTM) {
            sessionStorage.setItem('sukoda_utm', JSON.stringify(utm));
        }

        if (!sessionStorage.getItem('sukoda_landing_page')) {
            sessionStorage.setItem('sukoda_landing_page', window.location.pathname + window.location.search);
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    window.SUKODA_TRACKING = {
        // Consent
        acceptCookies: function() {
            document.cookie = 'sukoda_consent=accepted; path=/; max-age=' + (365 * 24 * 60 * 60) + '; SameSite=Lax; Secure';
            initAllTracking();
        },
        declineCookies: function() {
            document.cookie = 'sukoda_consent=declined; path=/; max-age=' + (365 * 24 * 60 * 60) + '; SameSite=Lax; Secure';
        },
        hasConsent: hasConsent,
        hasResponded: hasResponded,

        // UTM
        getUTM: function() {
            try {
                return JSON.parse(sessionStorage.getItem('sukoda_utm')) || {};
            } catch (e) {
                return {};
            }
        },
        getLandingPage: function() {
            return sessionStorage.getItem('sukoda_landing_page') || '';
        },

        // Conversion events (only fire with consent)
        trackViewContent: function(data) {
            if (!hasConsent()) return;
            // Meta Pixel
            if (pixelEnabled) {
                fbq('track', 'ViewContent', {
                    content_name: data.name || '',
                    content_category: data.category || 'cleaning',
                    content_type: 'product',
                    value: data.value || 0,
                    currency: 'EUR',
                });
            }
            // Google Analytics
            gaEvent('view_item', {
                currency: 'EUR',
                value: data.value || 0,
                items: [{
                    item_name: data.name || '',
                    item_category: data.category || 'cleaning',
                }]
            });
        },
        trackInitiateCheckout: function(data) {
            if (!hasConsent()) return;
            // Meta Pixel
            if (pixelEnabled) {
                fbq('track', 'InitiateCheckout', {
                    content_name: data.name || '',
                    content_category: data.category || 'cleaning',
                    value: data.value || 0,
                    currency: 'EUR',
                    num_items: 1,
                });
            }
            // Google Analytics
            gaEvent('begin_checkout', {
                currency: 'EUR',
                value: data.value || 0,
                items: [{
                    item_name: data.name || '',
                    item_category: data.category || 'cleaning',
                    quantity: 1,
                }]
            });
        },
        trackPurchase: function(data) {
            if (!hasConsent()) return;
            // Meta Pixel
            if (pixelEnabled) {
                fbq('track', 'Purchase', {
                    content_name: data.name || '',
                    content_category: data.category || 'cleaning',
                    value: data.value || 0,
                    currency: 'EUR',
                    num_items: 1,
                });
            }
            // Google Analytics
            gaEvent('purchase', {
                currency: 'EUR',
                value: data.value || 0,
                items: [{
                    item_name: data.name || '',
                    item_category: data.category || 'cleaning',
                    quantity: 1,
                }]
            });
        },
        trackLead: function(data) {
            if (!hasConsent()) return;
            // Meta Pixel
            if (pixelEnabled) {
                fbq('track', 'Lead', {
                    content_name: data.name || '',
                    content_category: data.category || '',
                });
            }
            // Google Analytics
            gaEvent('generate_lead', {
                currency: 'EUR',
                value: data.value || 0,
            });
        },
        trackContact: function() {
            if (!hasConsent()) return;
            // Meta Pixel
            if (pixelEnabled) {
                fbq('track', 'Contact');
            }
            // Google Analytics
            gaEvent('contact', {});
        },
    };

    captureUTM();
})();
