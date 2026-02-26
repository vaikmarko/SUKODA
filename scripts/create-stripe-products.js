/**
 * SUKODA Stripe Products Creation Script
 * 
 * This script creates all products and prices in Stripe
 * Run with: node scripts/create-stripe-products.js
 */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Product definitions
const PRODUCTS = {
  // KINGITUSED (One-time payments)
  gifts: {
    moment: {
      name: 'Üks Hetk',
      description: 'Üks täiuslik koduhoolitsus koos lillede, kaardi ja väikese üllatusega.',
      prices: {
        small: { amount: 21900, nickname: '1-2 tuba' },
        medium: { amount: 27900, nickname: '3 tuba' },
        large: { amount: 34900, nickname: '4 tuba' },
      }
    },
    month: {
      name: 'Kuu Aega',
      description: 'Kaks koduhoolitsust ühe kuu jooksul. Lilled, puuviljad ja aroomiküünal.',
      prices: {
        small: { amount: 41900, nickname: '1-2 tuba' },
        medium: { amount: 51900, nickname: '3 tuba' },
        large: { amount: 64900, nickname: '4 tuba' },
      }
    },
    quarter: {
      name: 'Kvartal Vabadust',
      description: 'Kuus koduhoolitsust kolme kuu jooksul. Lilled, puuviljad, taimede kastmine ja premium koduhooldusvahenid.',
      prices: {
        small: { amount: 109900, nickname: '1-2 tuba' },
        medium: { amount: 134900, nickname: '3 tuba' },
        large: { amount: 169900, nickname: '4 tuba' },
      }
    }
  },
  
  // PÜSITELLIMUSED (Recurring monthly)
  subscriptions: {
    once: {
      name: '1× kuus',
      description: 'Üks koduhoolitsus kuus. Lilled, käsitsi kirjutatud kaart, magus üllatus.',
      prices: {
        small: { amount: 17900, nickname: '1-2 tuba' },
        medium: { amount: 22900, nickname: '3 tuba' },
        large: { amount: 28900, nickname: '4 tuba' },
      }
    },
    twice: {
      name: '2× kuus',
      description: 'Kaks koduhoolitsust kuus. Lilled, kaart, puuviljad. Kõige populaarsem valik.',
      prices: {
        small: { amount: 31900, nickname: '1-2 tuba' },
        medium: { amount: 39900, nickname: '3 tuba' },
        large: { amount: 49900, nickname: '4 tuba' },
      }
    },
    weekly: {
      name: '4× kuus',
      description: 'Neli koduhoolitsust kuus. Lilled, kaart, puuviljad, taimede kastmine. Täielik vabadus.',
      prices: {
        small: { amount: 57900, nickname: '1-2 tuba' },
        medium: { amount: 71900, nickname: '3 tuba' },
        large: { amount: 89900, nickname: '4 tuba' },
      }
    }
  }
};

// Store created price IDs
const priceIds = {
  gifts: { moment: {}, month: {}, quarter: {} },
  subscriptions: { once: {}, twice: {}, weekly: {} }
};

async function createProducts() {
  console.log('🚀 Starting Stripe product creation...\n');
  
  // Create gift products (one-time)
  console.log('📦 Creating GIFT products (one-time payments)...\n');
  
  for (const [key, product] of Object.entries(PRODUCTS.gifts)) {
    console.log(`  Creating: ${product.name}`);
    
    const stripeProduct = await stripe.products.create({
      name: `SUKODA Kingitus: ${product.name}`,
      description: product.description,
      metadata: {
        type: 'gift',
        package: key,
      }
    });
    
    for (const [size, priceData] of Object.entries(product.prices)) {
      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: priceData.amount,
        currency: 'eur',
        nickname: `${product.name} - ${priceData.nickname}`,
        metadata: {
          type: 'gift',
          package: key,
          size: size,
        }
      });
      
      priceIds.gifts[key][size] = price.id;
      console.log(`    ✓ ${priceData.nickname}: €${priceData.amount / 100} → ${price.id}`);
    }
    console.log('');
  }
  
  // Create subscription products (recurring)
  console.log('📦 Creating SUBSCRIPTION products (recurring monthly)...\n');
  
  for (const [key, product] of Object.entries(PRODUCTS.subscriptions)) {
    console.log(`  Creating: ${product.name}`);
    
    const stripeProduct = await stripe.products.create({
      name: `SUKODA Tellimus: ${product.name}`,
      description: product.description,
      metadata: {
        type: 'subscription',
        package: key,
      }
    });
    
    for (const [size, priceData] of Object.entries(product.prices)) {
      const price = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: priceData.amount,
        currency: 'eur',
        recurring: { interval: 'month' },
        nickname: `${product.name} - ${priceData.nickname}`,
        metadata: {
          type: 'subscription',
          package: key,
          size: size,
        }
      });
      
      priceIds.subscriptions[key][size] = price.id;
      console.log(`    ✓ ${priceData.nickname}: €${priceData.amount / 100}/kuu → ${price.id}`);
    }
    console.log('');
  }
  
  // Output the price IDs for functions/index.js
  console.log('\n✅ All products created!\n');
  console.log('=' .repeat(60));
  console.log('Copy this to functions/index.js PRICE_IDS constant:');
  console.log('=' .repeat(60));
  console.log('\nconst PRICE_IDS = ' + JSON.stringify(priceIds, null, 2).replace(/"([^"]+)":/g, '$1:') + ';');
  console.log('\n');
  
  return priceIds;
}

// Run
createProducts()
  .then(() => {
    console.log('🎉 Done! Products are now in your Stripe dashboard.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });

