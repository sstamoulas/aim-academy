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
exports.rejectRegistration = exports.sendPaymentReminders = exports.markPayment = exports.approveRegistration = exports.deleteUser = exports.inviteUser = exports.setUserRole = exports.createPaymentIntent = exports.submitContactForm = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const cors_1 = __importDefault(require("cors"));
const https = __importStar(require("https"));
const nodemailer = __importStar(require("nodemailer"));
(0, app_1.initializeApp)();
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const gmailUser = (0, params_1.defineSecret)('GMAIL_USER');
const gmailPass = (0, params_1.defineSecret)('GMAIL_PASS');
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
const TO_EMAIL = 'aimacademyva@gmail.com';
function sendEmail(opts) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: opts.user, pass: opts.pass },
    });
    return transporter.sendMail({
        from: `AIM Academy <${opts.user}>`,
        to: opts.to,
        replyTo: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
    });
}
exports.submitContactForm = (0, https_1.onRequest)({ secrets: [gmailUser, gmailPass], timeoutSeconds: 30 }, (req, res) => {
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
            const interestList = (interests !== null && interests !== void 0 ? interests : []).join(', ') || 'None selected';
            await sendEmail({
                user: gmailUser.value(),
                pass: gmailPass.value(),
                to: TO_EMAIL,
                replyTo: email.trim(),
                subject: `New contact form submission from ${name.trim()}`,
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
// ── Role management (admin-only) ──────────────────────────────────────────────
const VALID_ROLES = ['admin', 'teacher', 'parent'];
/** Change an existing user's role. Caller must have role === 'admin'. */
exports.setUserRole = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can set user roles.');
    }
    const { uid, role } = request.data;
    if (!uid || !VALID_ROLES.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'uid and a valid role are required.');
    }
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { role });
    await (0, firestore_1.getFirestore)().collection('users').doc(uid).set({ role }, { merge: true });
    return { success: true };
});
/** Invite a new user by email with a role. Creates the account if needed and
 *  emails them a password-setup link. Caller must have role === 'admin'. */
exports.inviteUser = (0, https_1.onCall)({ secrets: [gmailUser, gmailPass] }, async (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can invite users.');
    }
    const { email, role, displayName } = request.data;
    if (!email || !VALID_ROLES.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'email and a valid role are required.');
    }
    // Create or fetch user
    let uid;
    try {
        const existing = await (0, auth_1.getAuth)().getUserByEmail(email);
        uid = existing.uid;
    }
    catch (_c) {
        const created = await (0, auth_1.getAuth)().createUser({
            email,
            displayName: displayName || undefined,
        });
        uid = created.uid;
    }
    // Set custom claim
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { role });
    // Persist to users collection
    await (0, firestore_1.getFirestore)().collection('users').doc(uid).set({
        email,
        displayName: displayName || '',
        role,
        createdAt: new Date().toISOString(),
        invitedBy: request.auth.uid,
    }, { merge: true });
    // Generate password-reset link and email it
    const resetLink = await (0, auth_1.getAuth)().generatePasswordResetLink(email);
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    try {
        await sendEmail({
            user: gmailUser.value(),
            pass: gmailPass.value(),
            to: email,
            subject: `You've been invited to AIM Academy as ${roleLabel}`,
            html: `
          <p>You have been invited to the <strong>Anas Ibn Malik Academy</strong> portal as a <strong>${roleLabel}</strong>.</p>
          <p><a href="${resetLink}">Click here to set your password and get started →</a></p>
          <p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>
        `,
        });
    }
    catch (emailErr) {
        console.error('Invite email failed (user was still created):', emailErr);
    }
    return { success: true, resetLink };
});
/** Delete a user from Auth and Firestore. Caller must have role === 'admin'. */
exports.deleteUser = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can delete users.');
    }
    const { uid, deleteStudents = false } = request.data;
    if (!uid)
        throw new https_1.HttpsError('invalid-argument', 'uid is required.');
    const db = (0, firestore_1.getFirestore)();
    // Look up the user's email so we can clean up email-linked records
    const authUser = await (0, auth_1.getAuth)().getUser(uid);
    const email = authUser.email;
    const cleanupOps = [
        (0, auth_1.getAuth)().deleteUser(uid),
        db.collection('users').doc(uid).delete(),
        db.collection('registrations').doc(uid).delete(),
    ];
    if (email) {
        // Optionally delete student records
        if (deleteStudents) {
            const studentsSnap = await db.collection('students').where('parentEmail', '==', email).get();
            studentsSnap.docs.forEach(d => cleanupOps.push(d.ref.delete()));
        }
        // Always clean up pending child requests
        const crSnap = await db.collection('childRequests').where('parentEmail', '==', email).get();
        crSnap.docs.forEach(d => cleanupOps.push(d.ref.delete()));
    }
    const crUidSnap = await db.collection('childRequests').where('parentUid', '==', uid).get();
    crUidSnap.docs.forEach(d => cleanupOps.push(d.ref.delete()));
    await Promise.all(cleanupOps);
    return { success: true };
});
/** Approve a pending family registration. Sets parent role, creates students, sends welcome email. */
exports.approveRegistration = (0, https_1.onCall)({ secrets: [gmailUser, gmailPass] }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can approve registrations.');
    }
    const { registrationId, classAssignments = [] } = request.data;
    if (!registrationId)
        throw new https_1.HttpsError('invalid-argument', 'registrationId is required.');
    const db = (0, firestore_1.getFirestore)();
    const regRef = db.collection('registrations').doc(registrationId);
    const regDoc = await regRef.get();
    if (!regDoc.exists)
        throw new https_1.HttpsError('not-found', 'Registration not found.');
    const reg = regDoc.data();
    const children = (_c = reg.children) !== null && _c !== void 0 ? _c : [];
    // Set parent role claim
    await (0, auth_1.getAuth)().setCustomUserClaims(registrationId, { role: 'parent' });
    // Upsert user record
    await db.collection('users').doc(registrationId).set({
        email: reg.email,
        displayName: reg.parentName,
        role: 'parent',
        createdAt: new Date().toISOString(),
        invitedBy: request.auth.uid,
    }, { merge: true });
    // Look up the current year default fee from the first assigned class
    let defaultTuitionAmount = null;
    const allClassIds = classAssignments.flatMap(a => { var _a; return (_a = a.classIds) !== null && _a !== void 0 ? _a : []; });
    if (allClassIds.length > 0) {
        const classDoc = await db.collection('classes').doc(allClassIds[0]).get();
        if (classDoc.exists) {
            defaultTuitionAmount = (_e = (_d = classDoc.data()) === null || _d === void 0 ? void 0 : _d.tuitionAmount) !== null && _e !== void 0 ? _e : null;
        }
    }
    // Create student records
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const assignment = classAssignments.find(a => a.childIndex === i);
        const classIds = (_f = assignment === null || assignment === void 0 ? void 0 : assignment.classIds) !== null && _f !== void 0 ? _f : [];
        // Reuse existing student record if name matches (preserves attendance history)
        const existingSnap = await db.collection('students')
            .where('parentEmail', '==', reg.email)
            .where('firstName', '==', child.firstName)
            .where('lastName', '==', child.lastName)
            .get();
        if (!existingSnap.empty) {
            const existing = existingSnap.docs[0];
            const updateData = {
                dateOfBirth: (_g = child.dateOfBirth) !== null && _g !== void 0 ? _g : null,
                grade: (_h = child.grade) !== null && _h !== void 0 ? _h : null,
                classIds,
                parentName: reg.parentName,
                parentPhone: reg.phone,
            };
            // Only set tuitionAmount if not already individually set
            if (!existing.data().tuitionAmount && defaultTuitionAmount) {
                updateData.tuitionAmount = defaultTuitionAmount;
            }
            await existing.ref.update(updateData);
        }
        else {
            const studentId = Math.random().toString(36).slice(2);
            await db.collection('students').doc(studentId).set({
                firstName: child.firstName,
                lastName: child.lastName,
                dateOfBirth: (_j = child.dateOfBirth) !== null && _j !== void 0 ? _j : null,
                grade: (_k = child.grade) !== null && _k !== void 0 ? _k : null,
                classIds,
                tuitionAmount: defaultTuitionAmount !== null && defaultTuitionAmount !== void 0 ? defaultTuitionAmount : null,
                parentName: reg.parentName,
                parentEmail: reg.email,
                parentPhone: reg.phone,
                notes: '',
                createdAt: new Date().toISOString(),
            });
        }
    }
    // Mark registration approved
    await regRef.update({
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: request.auth.uid,
    });
    // Send welcome email
    try {
        await sendEmail({
            user: gmailUser.value(),
            pass: gmailPass.value(),
            to: reg.email,
            subject: 'Your AIM Academy registration has been approved!',
            html: `
          <p>As-salamu alaykum <strong>${reg.parentName}</strong>,</p>
          <p>Your family registration with <strong>Anas Ibn Malik Academy</strong> has been approved!</p>
          <p><a href="https://aimava.org/portal/parent">Click here to access the Parent Portal →</a></p>
          <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
        `,
        });
    }
    catch (emailErr) {
        console.error('Approval email failed (registration was still approved):', emailErr);
    }
    return { success: true };
});
// ── Payment tracking ──────────────────────────────────────────────────────────
/** Mark or unmark a student's tuition payment for a given month. */
exports.markPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can mark payments.');
    }
    const { studentId, studentName, parentEmail, tuitionAmount, month, paid } = request.data;
    if (!studentId || !month) {
        throw new https_1.HttpsError('invalid-argument', 'studentId and month are required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const docId = `${studentId}__${month}`;
    const paymentRef = db.collection('payments').doc(docId);
    if (paid) {
        await paymentRef.set({
            studentId,
            studentName,
            parentEmail,
            tuitionAmount,
            month,
            paidAt: new Date().toISOString(),
            markedByUid: request.auth.uid,
        });
    }
    else {
        await paymentRef.delete();
    }
    return { success: true };
});
/** Send tuition reminder emails to parents with unpaid students for a given month. */
exports.sendPaymentReminders = (0, https_1.onCall)({ secrets: [gmailUser, gmailPass] }, async (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can send payment reminders.');
    }
    const { month } = request.data;
    if (!month) {
        throw new https_1.HttpsError('invalid-argument', 'month is required.');
    }
    const db = (0, firestore_1.getFirestore)();
    // Get all students with tuitionAmount > 0
    const studentsSnap = await db.collection('students').where('tuitionAmount', '>', 0).get();
    const students = studentsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
    // Get all payment docs for this month
    const paymentsSnap = await db.collection('payments').where('month', '==', month).get();
    const paidStudentIds = new Set(paymentsSnap.docs.map(d => d.data().studentId));
    // Find unpaid students
    const unpaidStudents = students.filter(s => !paidStudentIds.has(s.id));
    // Group by parentEmail
    const byParent = new Map();
    for (const student of unpaidStudents) {
        const email = student.parentEmail;
        if (!email)
            continue;
        if (!byParent.has(email))
            byParent.set(email, []);
        byParent.get(email).push(student);
    }
    // Build month label (e.g. "October 2026")
    const [year, monthNum] = month.split('-');
    const monthLabel = new Date(Number(year), Number(monthNum) - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let emailsSent = 0;
    for (const [parentEmail, children] of byParent) {
        const childList = children
            .map(c => `<li><strong>${c.firstName} ${c.lastName}</strong> — $${(c.tuitionAmount / 100).toFixed(2)}/mo</li>`)
            .join('\n');
        await sendEmail({
            user: gmailUser.value(),
            pass: gmailPass.value(),
            to: parentEmail,
            subject: `AIM Academy — Tuition Reminder for ${monthLabel}`,
            html: `
          <p>As-salamu alaykum,</p>
          <p>This is a friendly reminder that tuition for <strong>${monthLabel}</strong> has not yet been received for the following student(s):</p>
          <ul>${childList}</ul>
          <p>Please send payment via Zelle to <strong>aimacademyva@gmail.com</strong>.</p>
          <p>If you have already sent payment, please disregard this message. Jazak Allah khayran!</p>
          <p style="color:#888;font-size:12px;">Anas Ibn Malik Academy</p>
        `,
        });
        emailsSent++;
    }
    return { success: true, emailsSent };
});
/** Reject a pending family registration with an optional reason. */
exports.rejectRegistration = (0, https_1.onCall)({ secrets: [gmailUser, gmailPass] }, async (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can reject registrations.');
    }
    const { registrationId, reason = '' } = request.data;
    if (!registrationId)
        throw new https_1.HttpsError('invalid-argument', 'registrationId is required.');
    const db = (0, firestore_1.getFirestore)();
    const regRef = db.collection('registrations').doc(registrationId);
    const regDoc = await regRef.get();
    if (!regDoc.exists)
        throw new https_1.HttpsError('not-found', 'Registration not found.');
    const reg = regDoc.data();
    await regRef.update({
        status: 'rejected',
        rejectReason: reason,
        reviewedAt: new Date().toISOString(),
        reviewedBy: request.auth.uid,
    });
    // Notify parent
    try {
        await sendEmail({
            user: gmailUser.value(),
            pass: gmailPass.value(),
            to: reg.email,
            subject: 'AIM Academy — Registration Update',
            html: `
          <p>As-salamu alaykum <strong>${reg.parentName}</strong>,</p>
          <p>We have reviewed your family registration with Anas Ibn Malik Academy.</p>
          ${reason ? `<p>Unfortunately, we are unable to approve your registration at this time.</p><p><strong>Reason:</strong> ${reason}</p>` : '<p>Unfortunately, we are unable to approve your registration at this time.</p>'}
          <p>Please contact us if you have any questions.</p>
          <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
        `,
        });
    }
    catch (emailErr) {
        console.error('Rejection email failed (registration was still rejected):', emailErr);
    }
    return { success: true };
});
//# sourceMappingURL=index.js.map