/**
 * SUKODA Tracking & Analytics
 * Meta Pixel + UTM parameter capture + Conversion events
 * GDPR-compliant: Pixel loads ONLY after user consent
 */

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const META_PIXEL_ID = '2178046653021231';
    const pixelEnabled = META_PIXEL_ID && META_PIXEL_ID !== 'SINU_PIXEL_ID_SIIA';

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

    // Auto-initialize if consent already given
    if (hasConsent()) {
        initPixel();
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
            document.cookie = 'sukoda_consent=accepted; path=/; max-age=' + (365 * 24 * 60 * 60) + '; SameSite=Lax';
            initPixel();
        },
        declineCookies: function() {
            document.cookie = 'sukoda_consent=declined; path=/; max-age=' + (365 * 24 * 60 * 60) + '; SameSite=Lax';
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
            if (!pixelEnabled || !hasConsent()) return;
            fbq('track', 'ViewContent', {
                content_name: data.name || '',
                content_category: data.category || 'cleaning',
                content_type: 'product',
                value: data.value || 0,
                currency: 'EUR',
            });
        },
        trackInitiateCheckout: function(data) {
            if (!pixelEnabled || !hasConsent()) return;
            fbq('track', 'InitiateCheckout', {
                content_name: data.name || '',
                content_category: data.category || 'cleaning',
                value: data.value || 0,
                currency: 'EUR',
                num_items: 1,
            });
        },
        trackPurchase: function(data) {
            if (!pixelEnabled || !hasConsent()) return;
            fbq('track', 'Purchase', {
                content_name: data.name || '',
                content_category: data.category || 'cleaning',
                value: data.value || 0,
                currency: 'EUR',
                num_items: 1,
            });
        },
        trackLead: function(data) {
            if (!pixelEnabled || !hasConsent()) return;
            fbq('track', 'Lead', {
                content_name: data.name || '',
                content_category: data.category || '',
            });
        },
        trackContact: function() {
            if (!pixelEnabled || !hasConsent()) return;
            fbq('track', 'Contact');
        },
    };

    captureUTM();
})();
