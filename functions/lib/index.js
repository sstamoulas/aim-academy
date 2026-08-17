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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.createPaymentIntent = (0, https_1.onCall)({ secrets: [stripeSecret], cors: ['https://aim-academy-7fdae.web.app'] }, async (request) => {
    const Stripe = (await Promise.resolve().then(() => __importStar(require('stripe')))).default;
    const stripe = new Stripe(stripeSecret.value());
    const { amount, currency = 'usd', description } = request.data;
    if (!amount || typeof amount !== 'number' || amount < 50) {
        throw new https_1.HttpsError('invalid-argument', 'Amount must be a number ≥ 50 (cents)');
    }
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        description,
        automatic_payment_methods: { enabled: true },
    });
    return { clientSecret: paymentIntent.client_secret };
});
//# sourceMappingURL=index.js.map