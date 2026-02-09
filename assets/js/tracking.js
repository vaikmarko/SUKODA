/**
 * SUKODA Tracking & Analytics
 * Meta Pixel + UTM parameter capture + Conversion events
 * 
 * SETUP: Replace META_PIXEL_ID with your actual Pixel ID from Meta Business Suite
 * Go to: https://business.facebook.com/events_manager → Pixel → Settings → Pixel ID
 */

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION — change this to your actual Meta Pixel ID
    // ============================================================
    const META_PIXEL_ID = '2178046653021231';
    // ============================================================

    // Skip if no real Pixel ID configured
    const pixelEnabled = META_PIXEL_ID && META_PIXEL_ID !== 'SINU_PIXEL_ID_SIIA';

    // ----------------------------------------------------------
    // 1. META PIXEL BASE CODE
    // ----------------------------------------------------------
    if (pixelEnabled) {
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
    }

    // ----------------------------------------------------------
    // 2. UTM PARAMETER CAPTURE
    // ----------------------------------------------------------
    function captureUTM() {
        const params = new URLSearchParams(window.location.search);
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        const utm = {};
        let hasUTM = false;

        utmKeys.forEach(key => {
            const val = params.get(key);
            if (val) {
                utm[key] = val;
                hasUTM = true;
            }
        });

        // Also capture fbclid (Facebook Click ID) for better attribution
        const fbclid = params.get('fbclid');
        if (fbclid) {
            utm.fbclid = fbclid;
            hasUTM = true;
        }

        // Store in sessionStorage (persists across page navigation within session)
        if (hasUTM) {
            sessionStorage.setItem('sukoda_utm', JSON.stringify(utm));
        }

        // Also store landing page
        if (!sessionStorage.getItem('sukoda_landing_page')) {
            sessionStorage.setItem('sukoda_landing_page', window.location.pathname + window.location.search);
        }
    }

    // Get stored UTM data (for use in checkout)
    window.SUKODA_TRACKING = {
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
        // ----------------------------------------------------------
        // 3. CONVERSION EVENTS
        // ----------------------------------------------------------
        trackViewContent: function(data) {
            if (!pixelEnabled) return;
            fbq('track', 'ViewContent', {
                content_name: data.name || '',
                content_category: data.category || 'cleaning',
                content_type: 'product',
                value: data.value || 0,
                currency: 'EUR',
            });
        },
        trackInitiateCheckout: function(data) {
            if (!pixelEnabled) return;
            fbq('track', 'InitiateCheckout', {
                content_name: data.name || '',
                content_category: data.category || 'cleaning',
                value: data.value || 0,
                currency: 'EUR',
                num_items: 1,
            });
        },
        trackPurchase: function(data) {
            if (!pixelEnabled) return;
            fbq('track', 'Purchase', {
                content_name: data.name || '',
                content_category: data.category || 'cleaning',
                value: data.value || 0,
                currency: 'EUR',
                num_items: 1,
            });
        },
        trackLead: function(data) {
            if (!pixelEnabled) return;
            fbq('track', 'Lead', {
                content_name: data.name || '',
                content_category: data.category || '',
            });
        },
        trackContact: function() {
            if (!pixelEnabled) return;
            fbq('track', 'Contact');
        },
    };

    // Run UTM capture on every page
    captureUTM();

})();
