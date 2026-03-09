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
      small: 'price_1T51LQEoH1b07UGQXIx58Ipf',    // 219€
      medium: 'price_1T51LQEoH1b07UGQs6SVNha0',  // 279€
      large: 'price_1T51LQEoH1b07UGQrRB2dK4y',    // 349€
    },
    // Kuu Aega - kaks koristuskorda
    month: {
      small: 'price_1T51LREoH1b07UGQmq2lmlqR',     // 419€
      medium: 'price_1T51LREoH1b07UGQZqOx9ixS',   // 519€
      large: 'price_1T51LSEoH1b07UGQUhpp0B8u',     // 649€
    },
    // Kvartal Vabadust - kuus koristuskorda
    quarter: {
      small: 'price_1T51LSEoH1b07UGQJNJkNsH5',   // 1099€
      medium: 'price_1T51LTEoH1b07UGQmBbzkp04', // 1349€
      large: 'price_1T51LTEoH1b07UGQWt1dkflE',   // 1699€
    },
  },

  // ==========================================
  // PÜSITELLIMUSED (recurring monthly)
  // ==========================================
  subscriptions: {
    // 1× kuus - 1× külastus kuus
    once: {
      small: 'price_1T5AJyEoH1b07UGQeSWsu5I0',      // 199€/kuu
      medium: 'price_1T51LUEoH1b07UGQPsUzybQS',    // 229€/kuu
      large: 'price_1T51LUEoH1b07UGQs0BYqLx2',      // 289€/kuu
    },
    // 2× kuus - 2× külastust kuus
    twice: {
      small: 'price_1T51LVEoH1b07UGQp5MscEFb',     // 319€/kuu
      medium: 'price_1T51LVEoH1b07UGQg8c4tW5t',   // 399€/kuu
      large: 'price_1T51LVEoH1b07UGQrFg16Y7y',     // 499€/kuu
    },
    // 4× kuus - 4× külastust kuus
    weekly: {
      small: 'price_1T51LWEoH1b07UGQ4Bh1ig1o',    // 579€/kuu
      medium: 'price_1T51LWEoH1b07UGQ9NLtoAgb',  // 719€/kuu
      large: 'price_1T51LXEoH1b07UGQmVNjYRf6',    // 899€/kuu
    },
  },
};

// Hinnad (eurodes) - kasutatakse UI-s
export const PRICES = {
  gifts: {
    moment: { small: 219, medium: 279, large: 349 },
    month: { small: 419, medium: 519, large: 649 },
    quarter: { small: 1099, medium: 1349, large: 1699 },
  },
  subscriptions: {
    once: { small: 199, medium: 229, large: 289 },
    twice: { small: 319, medium: 399, large: 499 },
    weekly: { small: 579, medium: 719, large: 899 },
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
    once: { et: '1× kuus', en: '1× month' },
    twice: { et: '2× kuus', en: '2× month' },
    weekly: { et: '4× kuus', en: '4× month' },
  },
};

// Suuruste nimed
export const SIZE_NAMES = {
  small: { et: '1-2 tuba', en: '1-2 rooms' },
  medium: { et: '3 tuba', en: '3 rooms' },
  large: { et: '4 tuba', en: '4 rooms' },
};

