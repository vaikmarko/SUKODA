const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

const ALLOWED_ORIGINS = [
  'https://sukoda.ee',
  'https://www.sukoda.ee',
];
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  ALLOWED_ORIGINS.push('http://localhost:5000', 'http://localhost:5173', 'http://127.0.0.1:5173');
}
const cors = require('cors')({ origin: ALLOWED_ORIGINS });

const SECRETS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'CAL_API_KEY',
  'CAL_WEBHOOK_SECRET',
  'ADMIN_PASSWORD',
];

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

let _resend;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (key) _resend = new Resend(key);
  }
  return _resend;
}

const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'tere@sukoda.ee';
const MIN_BOOKING_LEAD_HOURS = 24;
const LAUNCH_DATE = '2026-02-25';

function authenticateAdmin(req) {
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  if (!adminPassword) return false;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7) === adminPassword;
  return false;
}

const rateLimitStore = {};
function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  if (now > rateLimitStore[key].resetAt) {
    rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  rateLimitStore[key].count++;
  return rateLimitStore[key].count <= maxRequests;
}

function checkRateLimit(req, res, limitName, maxRequests, windowMs) {
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  const key = `${limitName}:${ip}`;
  if (!rateLimit(key, maxRequests, windowMs)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return false;
  }
  return true;
}

module.exports = {
  functions,
  admin,
  cors,
  db,
  SECRETS,
  getStripe,
  getResend,
  NOTIFICATION_EMAIL,
  MIN_BOOKING_LEAD_HOURS,
  LAUNCH_DATE,
  authenticateAdmin,
  checkRateLimit,
};
