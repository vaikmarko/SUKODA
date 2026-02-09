/**
 * Create €1 test product and update descriptions
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
  console.log('🚀 Creating €1 test product...\n');

  // 1. Create €1 test product
  const testProduct = await stripe.products.create({
    name: 'SUKODA Test',
    description: 'Testtellimus - €1',
    metadata: {
      type: 'test',
    }
  });

  const testPrice = await stripe.prices.create({
    product: testProduct.id,
    unit_amount: 100, // €1.00
    currency: 'eur',
    recurring: { interval: 'month' },
    nickname: 'Test €1',
  });

  console.log('✅ Test product created!');
  console.log(`   Product ID: ${testProduct.id}`);
  console.log(`   Price ID: ${testPrice.id}`);
  console.log(`   Amount: €1.00/kuu\n`);

  // 2. Update existing products - remove "Kohv ja kook kohvikus"
  console.log('📝 Updating existing product descriptions...\n');

  const products = await stripe.products.list({ limit: 100 });
  
  for (const product of products.data) {
    if (product.description && product.description.includes('Kohv ja kook')) {
      const newDescription = product.description
        .replace(/\s*Kohv ja kook kohvikus\.?\s*/g, '')
        .replace(/\s*Sisaldab kohvi ja kooki kohvikus\.?\s*/g, '')
        .trim();
      
      await stripe.products.update(product.id, {
        description: newDescription,
      });
      
      console.log(`   ✓ Updated: ${product.name}`);
      console.log(`     Old: ${product.description}`);
      console.log(`     New: ${newDescription}\n`);
    }
  }

  console.log('\n✅ Done!');
  console.log('\n📋 Add this test price ID to functions/index.js:');
  console.log(`\n   test: '${testPrice.id}'`);
  
  return testPrice.id;
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
