/**
 * SUKODA Stripe Configuration
 * 
 * JUHEND:
 * 1. Mine Stripe Dashboard -> Products
 * 2. Loo iga toode ja hind vastavalt allpool toodud struktuurile
 * 3. Kopeeri Price ID (algab "price_") siia faili
 * 
 * Test mode: kasuta test API võtmeid
 * Live mode: vaheta live API võtmed kui valmis
 */

// Stripe Price ID-d - TÄIDA NEED PÄRAST STRIPE'IS TOODETE LOOMIST
export const STRIPE_PRICES = {
  // ==========================================
  // KINGITUSED (one-time payments)
  // ==========================================
  gifts: {
    // Üks Hetk - üks koristuskord
    moment: {
      small: 'price_TÄIDA_MOMENT_SMALL',    // 149€ (kuni 50m²)
      medium: 'price_TÄIDA_MOMENT_MEDIUM',  // 179€ (51-90m²)
      large: 'price_TÄIDA_MOMENT_LARGE',    // 229€ (91-120m²)
      xlarge: 'price_TÄIDA_MOMENT_XLARGE',  // 279€ (121-150m²)
    },
    // Kuu Aega - kaks koristuskorda
    month: {
      small: 'price_TÄIDA_MONTH_SMALL',     // 299€
      medium: 'price_TÄIDA_MONTH_MEDIUM',   // 349€
      large: 'price_TÄIDA_MONTH_LARGE',     // 449€
      xlarge: 'price_TÄIDA_MONTH_XLARGE',   // 549€
    },
    // Kvartal Vabadust - kuus koristuskorda
    quarter: {
      small: 'price_TÄIDA_QUARTER_SMALL',   // 749€
      medium: 'price_TÄIDA_QUARTER_MEDIUM', // 899€
      large: 'price_TÄIDA_QUARTER_LARGE',   // 1099€
      xlarge: 'price_TÄIDA_QUARTER_XLARGE', // 1299€
    },
  },

  // ==========================================
  // PÜSITELLIMUSED (recurring monthly)
  // ==========================================
  subscriptions: {
    // Kord kuus - 1× külastus kuus
    once: {
      small: 'price_TÄIDA_ONCE_SMALL',      // 119€/kuu
      medium: 'price_TÄIDA_ONCE_MEDIUM',    // 149€/kuu
      large: 'price_TÄIDA_ONCE_LARGE',      // 189€/kuu
      xlarge: 'price_TÄIDA_ONCE_XLARGE',    // 229€/kuu
    },
    // Üle nädala - 2× külastust kuus
    twice: {
      small: 'price_TÄIDA_TWICE_SMALL',     // 199€/kuu
      medium: 'price_TÄIDA_TWICE_MEDIUM',   // 249€/kuu
      large: 'price_TÄIDA_TWICE_LARGE',     // 319€/kuu
      xlarge: 'price_TÄIDA_TWICE_XLARGE',   // 389€/kuu
    },
    // Iga nädal - 4× külastust kuus
    weekly: {
      small: 'price_TÄIDA_WEEKLY_SMALL',    // 379€/kuu
      medium: 'price_TÄIDA_WEEKLY_MEDIUM',  // 449€/kuu
      large: 'price_TÄIDA_WEEKLY_LARGE',    // 579€/kuu
      xlarge: 'price_TÄIDA_WEEKLY_XLARGE',  // 699€/kuu
    },
  },
};

// Hinnad (eurodes) - kasutatakse UI-s
export const PRICES = {
  gifts: {
    moment: { small: 149, medium: 179, large: 229, xlarge: 279 },
    month: { small: 299, medium: 349, large: 449, xlarge: 549 },
    quarter: { small: 749, medium: 899, large: 1099, xlarge: 1299 },
  },
  subscriptions: {
    once: { small: 119, medium: 149, large: 189, xlarge: 229 },
    twice: { small: 199, medium: 249, large: 319, xlarge: 389 },
    weekly: { small: 379, medium: 449, large: 579, xlarge: 699 },
  },
};

// Pakettide nimed
export const PACKAGE_NAMES = {
  gifts: {
    moment: { et: 'Üks Hetk', en: 'One Moment' },
    month: { et: 'Kuu Aega', en: 'A Month' },
    quarter: { et: 'Kvartal Vabadust', en: 'Quarter of Freedom' },
  },
  subscriptions: {
    once: { et: 'Kord kuus', en: 'Once a month' },
    twice: { et: 'Üle nädala', en: 'Biweekly' },
    weekly: { et: 'Iga nädal', en: 'Weekly' },
  },
};

// Suuruste nimed
export const SIZE_NAMES = {
  small: { et: 'Kuni 50m²', en: 'Up to 50m²' },
  medium: { et: '51-90m²', en: '51-90m²' },
  large: { et: '91-120m²', en: '91-120m²' },
  xlarge: { et: '121-150m²', en: '121-150m²' },
};

