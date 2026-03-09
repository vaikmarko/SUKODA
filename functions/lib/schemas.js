const { z } = require('zod');

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().min(6).max(30).optional().default(''),
  address: z.string().max(500).optional().default(''),
  additionalInfo: z.string().max(2000).optional().default(''),
});

const recipientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320).optional().default(''),
  address: z.string().max(500).optional().default(''),
  message: z.string().max(1000).optional().default(''),
});

const checkoutSchema = z.object({
  type: z.enum(['subscription', 'gift']),
  packageType: z.enum(['once', 'twice', 'weekly', 'moment', 'month', 'quarter']),
  size: z.enum(['small', 'medium', 'large']),
  customer: customerSchema,
  recipient: recipientSchema.optional(),
  deliveryMethod: z.enum(['email', 'post']).optional(),
  lang: z.enum(['et', 'en']).optional().default('et'),
  promoCode: z.string().max(50).optional(),
  referralCode: z.string().max(50).optional(),
  tracking: z.object({
    utm_source: z.string().max(200).optional(),
    utm_medium: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    utm_term: z.string().max(200).optional(),
    fbclid: z.string().max(500).optional(),
    landing_page: z.string().max(500).optional(),
  }).optional(),
});

const waitlistSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional().default(''),
  city: z.string().max(200).optional().default(''),
  address: z.string().max(500).optional().default(''),
  lang: z.enum(['et', 'en']).optional().default('et'),
});

const bookGiftSchema = z.object({
  code: z.string().min(4).max(30),
  startTime: z.string().min(10).max(50),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(30).optional().default(''),
  address: z.string().max(500).optional().default(''),
  additionalInfo: z.string().max(2000).optional().default(''),
});

const bookSubscriptionSchema = z.object({
  orderId: z.string().min(1).max(100),
  startTime: z.string().min(10).max(50),
});

const giftUpgradeSchema = z.object({
  code: z.string().min(4).max(30),
  newSize: z.enum(['small', 'medium', 'large']),
});

const estateInquirySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(30).optional().default(''),
  additionalInfo: z.string().max(2000).optional().default(''),
  selectedRhythm: z.string().max(50).optional().default(''),
  lang: z.enum(['et', 'en']).optional().default('et'),
});

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    return { ok: false, error: errors.join('; ') };
  }
  return { ok: true, data: result.data };
}

module.exports = {
  checkoutSchema,
  waitlistSchema,
  bookGiftSchema,
  bookSubscriptionSchema,
  giftUpgradeSchema,
  estateInquirySchema,
  validate,
};
