"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = exports.submitContactForm = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const cors_1 = __importDefault(require("cors"));
const https = __importStar(require("https"));
const nodemailer = __importStar(require("nodemailer"));
(0, app_1.initializeApp)();
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const gmailAppPassword = (0, params_1.defineSecret)('GMAIL_APP_PASSWORD');
const corsMiddleware = (0, cors_1.default)({ origin: true });
function createStripePaymentIntent(secretKey, amount, currency, description) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            amount: String(amount),
            currency,
            'automatic_payment_methods[enabled]': 'true',
        });
        if (description)
            params.append('description', description);
        const body = params.toString();
        const req = https.request({
            hostname: 'api.stripe.com',
            port: 443,
            path: '/v1/payment_intents',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey.trim()}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                var _a, _b;
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error((_b = (_a = json.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : `Stripe HTTP ${res.statusCode}`));
                    }
                    else {
                        resolve(json);
                    }
                }
                catch (_c) {
                    reject(new Error('Failed to parse Stripe response'));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(20000, () => {
            req.destroy(new Error('Stripe request timed out'));
        });
        req.write(body);
        req.end();
    });
}
const GMAIL_USER = 'aimacademyva@gmail.com';
exports.submitContactForm = (0, https_1.onRequest)({ secrets: [gmailAppPassword], timeoutSeconds: 30 }, (req, res) => {
    corsMiddleware(req, res, async () => {
        var _a;
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const { name, phone, email, interests, message } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim()) || !(phone === null || phone === void 0 ? void 0 : phone.trim()) || !(email === null || email === void 0 ? void 0 : email.trim())) {
            res.status(400).json({ error: 'name, phone, and email are required' });
            return;
        }
        try {
            const db = (0, firestore_1.getFirestore)();
            await db.collection('contactSubmissions').add({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                interests: interests !== null && interests !== void 0 ? interests : [],
                message: (_a = message === null || message === void 0 ? void 0 : message.trim()) !== null && _a !== void 0 ? _a : '',
                submittedAt: new Date().toISOString(),
            });
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: GMAIL_USER, pass: gmailAppPassword.value() },
            });
            const interestList = (interests !== null && interests !== void 0 ? interests : []).join(', ') || 'None selected';
            await transporter.sendMail({
                from: `"AIM Academy Website" <${GMAIL_USER}>`,
                to: GMAIL_USER,
                replyTo: email.trim(),
                subject: `New contact form submission from ${name.trim()}`,
                text: [
                    `Name: ${name.trim()}`,
                    `Phone: ${phone.trim()}`,
                    `Email: ${email.trim()}`,
                    `Interested in: ${interestList}`,
                    `Message: ${(message === null || message === void 0 ? void 0 : message.trim()) || '(none)'}`,
                ].join('\n'),
                html: `
            <p><strong>Name:</strong> ${name.trim()}</p>
            <p><strong>Phone:</strong> ${phone.trim()}</p>
            <p><strong>Email:</strong> ${email.trim()}</p>
            <p><strong>Interested in:</strong> ${interestList}</p>
            <p><strong>Message:</strong> ${(message === null || message === void 0 ? void 0 : message.trim()) || '(none)'}</p>
          `,
            });
            res.json({ success: true });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Contact form error:', msg);
            res.status(500).json({ error: 'Failed to save submission' });
        }
    });
});
exports.createPaymentIntent = (0, https_1.onRequest)({ secrets: [stripeSecret], timeoutSeconds: 30 }, (req, res) => {
    corsMiddleware(req, res, async () => {
        var _a, _b;
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const payload = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : req.body;
        const { amount, currency = 'usd', description } = payload;
        if (!amount || typeof amount !== 'number' || amount < 50) {
            res.status(400).json({ error: 'Amount must be a number ≥ 50 (cents)' });
            return;
        }
        try {
            const paymentIntent = await createStripePaymentIntent(stripeSecret.value(), amount, currency, description);
            res.json({ clientSecret: paymentIntent.client_secret });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('Stripe error:', message);
            res.status(500).json({ error: message });
        }
    });
});
//# sourceMappingURL=index.js.map