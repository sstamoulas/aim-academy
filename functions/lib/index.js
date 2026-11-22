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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSeedData = exports.seedDatabase = exports.notifyCaughtUpParent = exports.notifyMissedWorkParent = exports.rejectRegistration = exports.notifyAnnouncementParents = exports.sendAttendanceReminders = exports.sendPaymentReminders = exports.markPayment = exports.approveRegistration = exports.deleteUser = exports.inviteUser = exports.setUserRole = exports.createPaymentIntent = exports.submitContactForm = void 0;
const v1_1 = require("firebase-functions/v1");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { config: functionsConfig } = require('firebase-functions');
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const cors_1 = __importDefault(require("cors"));
const https = __importStar(require("https"));
const nodemailer = __importStar(require("nodemailer"));
(0, app_1.initializeApp)();
const corsMiddleware = (0, cors_1.default)({ origin: true });
/** Read runtime secrets from Firebase environment config (v1-style).
 *  Set with: firebase functions:config:set gmail.user=... gmail.pass=... stripe.secret=...
 */
function getCfg() {
    var _a, _b, _c, _d, _e, _f;
    const cfg = functionsConfig();
    return {
        gmailUser: (_b = (_a = cfg.gmail) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : '',
        gmailPass: (_d = (_c = cfg.gmail) === null || _c === void 0 ? void 0 : _c.pass) !== null && _d !== void 0 ? _d : '',
        stripeSecret: (_f = (_e = cfg.stripe) === null || _e === void 0 ? void 0 : _e.secret) !== null && _f !== void 0 ? _f : '',
    };
}
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
exports.submitContactForm = v1_1.https.onRequest((req, res) => {
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
            const { gmailUser, gmailPass } = getCfg();
            await sendEmail({
                user: gmailUser,
                pass: gmailPass,
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
exports.createPaymentIntent = v1_1.https.onRequest((req, res) => {
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
            const { stripeSecret } = getCfg();
            const paymentIntent = await createStripePaymentIntent(stripeSecret, amount, currency, description);
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
exports.setUserRole = v1_1.https.onCall(async (data, context) => {
    var _a, _b;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can set user roles.');
    }
    const { uid, role } = data;
    if (!uid || !VALID_ROLES.includes(role)) {
        throw new v1_1.https.HttpsError('invalid-argument', 'uid and a valid role are required.');
    }
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { role });
    await (0, firestore_1.getFirestore)().collection('users').doc(uid).set({ role }, { merge: true });
    return { success: true };
});
/** Invite a new user by email with a role. Creates the account if needed and
 *  emails them a password-setup link. Caller must have role === 'admin'. */
exports.inviteUser = v1_1.https.onCall(async (data, context) => {
    var _a, _b;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can invite users.');
    }
    const { email, role, displayName } = data;
    if (!email || !VALID_ROLES.includes(role)) {
        throw new v1_1.https.HttpsError('invalid-argument', 'email and a valid role are required.');
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
        invitedBy: context.auth.uid,
    }, { merge: true });
    // Generate password-reset link and email it
    const resetLink = await (0, auth_1.getAuth)().generatePasswordResetLink(email);
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const { gmailUser, gmailPass } = getCfg();
    try {
        await sendEmail({
            user: gmailUser,
            pass: gmailPass,
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
exports.deleteUser = v1_1.https.onCall(async (data, context) => {
    var _a, _b;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can delete users.');
    }
    const { uid, deleteStudents = false } = data;
    if (!uid)
        throw new v1_1.https.HttpsError('invalid-argument', 'uid is required.');
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
exports.approveRegistration = v1_1.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can approve registrations.');
    }
    const { registrationId, classAssignments = [] } = data;
    if (!registrationId)
        throw new v1_1.https.HttpsError('invalid-argument', 'registrationId is required.');
    const db = (0, firestore_1.getFirestore)();
    const regRef = db.collection('registrations').doc(registrationId);
    const regDoc = await regRef.get();
    if (!regDoc.exists)
        throw new v1_1.https.HttpsError('not-found', 'Registration not found.');
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
        invitedBy: context.auth.uid,
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
        reviewedBy: context.auth.uid,
    });
    // Send welcome email
    const { gmailUser, gmailPass } = getCfg();
    try {
        await sendEmail({
            user: gmailUser,
            pass: gmailPass,
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
exports.markPayment = v1_1.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can mark payments.');
    }
    const { studentId, studentName, parentEmail, tuitionAmount, month, paid } = data;
    if (!studentId || !month) {
        throw new v1_1.https.HttpsError('invalid-argument', 'studentId and month are required.');
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
            markedByUid: (_d = (_c = context.auth) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : '',
        });
    }
    else {
        await paymentRef.delete();
    }
    return { success: true };
});
/** Send tuition reminder emails to parents with unpaid students for a given month. */
exports.sendPaymentReminders = v1_1.https.onCall(async (data, context) => {
    var _a, _b;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can send payment reminders.');
    }
    const { month } = data;
    if (!month) {
        throw new v1_1.https.HttpsError('invalid-argument', 'month is required.');
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
    const { gmailUser, gmailPass } = getCfg();
    let emailsSent = 0;
    for (const [parentEmail, children] of byParent) {
        const childList = children
            .map(c => `<li><strong>${c.firstName} ${c.lastName}</strong> — $${(c.tuitionAmount / 100).toFixed(2)}/mo</li>`)
            .join('\n');
        await sendEmail({
            user: gmailUser,
            pass: gmailPass,
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
// ── Attendance reminders ──────────────────────────────────────────────────────
/** Send attendance reminder emails to teachers who haven't submitted for the current week. */
exports.sendAttendanceReminders = v1_1.https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can send attendance reminders.');
    }
    const { classIds } = data;
    // Current week Monday–Sunday (ISO)
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    const weekLabel = monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const db = (0, firestore_1.getFirestore)();
    // Load classes (all or filtered)
    let classSnap;
    if (classIds && classIds.length > 0) {
        const docs = await Promise.all(classIds.map(id => db.collection('classes').doc(id).get()));
        classSnap = { docs: docs.filter(d => d.exists) };
    }
    else {
        classSnap = await db.collection('classes').get();
    }
    // Group incomplete classes by teacherUid
    const byTeacher = new Map();
    await Promise.all(classSnap.docs.map(async (classDoc) => {
        const cls = classDoc.data();
        if (!cls.teacherUid)
            return;
        // Check if attendance was submitted this week
        const attSnap = await db.collection('attendance')
            .where('classId', '==', classDoc.id)
            .where('date', '>=', mondayStr)
            .where('date', '<=', sundayStr)
            .get();
        if (!attSnap.empty)
            return; // already submitted
        if (!byTeacher.has(cls.teacherUid)) {
            byTeacher.set(cls.teacherUid, { teacherName: cls.teacherName, classNames: [] });
        }
        byTeacher.get(cls.teacherUid).classNames.push(cls.name);
    }));
    // Look up teacher emails and send
    const { gmailUser, gmailPass } = getCfg();
    let emailsSent = 0;
    for (const [teacherUid, { teacherName, classNames }] of byTeacher) {
        const userDoc = await db.collection('users').doc(teacherUid).get();
        const teacherEmail = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.email;
        if (!teacherEmail)
            continue;
        const classList = classNames.map(n => `<li><strong>${n}</strong></li>`).join('\n');
        const greeting = teacherName ? `Ustadh/Ustadha ${teacherName}` : 'Teacher';
        try {
            await sendEmail({
                user: gmailUser,
                pass: gmailPass,
                to: teacherEmail,
                subject: `Attendance Reminder — Week of ${weekLabel}`,
                html: `
          <p>As-salamu alaykum <strong>${greeting}</strong>,</p>
          <p>This is a friendly reminder that attendance has not yet been submitted for the week of <strong>${weekLabel}</strong> for the following class(es):</p>
          <ul>${classList}</ul>
          <p>Please log in to the Teacher Portal to submit attendance:</p>
          <p><a href="https://aimava.org/portal/teacher">Teacher Portal →</a></p>
          <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br>Anas Ibn Malik Academy</p>
        `,
            });
            emailsSent++;
        }
        catch (err) {
            console.error(`Failed to email ${teacherEmail}:`, err);
        }
    }
    return { success: true, emailsSent, teachersReminded: byTeacher.size };
});
// ── Announcement notifications ────────────────────────────────────────────────
/** Email all parents in a class when a teacher posts an announcement. */
exports.notifyAnnouncementParents = v1_1.https.onCall(async (data, context) => {
    var _a, _b;
    const role = (_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role;
    if (role !== 'admin' && role !== 'teacher') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only teachers and admins can send announcement notifications.');
    }
    const { classId, className, teacherName, title, body } = data;
    if (!classId || !title) {
        throw new v1_1.https.HttpsError('invalid-argument', 'classId and title are required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const studentsSnap = await db.collection('students').where('classIds', 'array-contains', classId).get();
    // Collect unique parent emails
    const parentEmails = new Set();
    for (const doc of studentsSnap.docs) {
        const email = doc.data().parentEmail;
        if (email)
            parentEmails.add(email);
    }
    if (parentEmails.size === 0)
        return { success: true, emailsSent: 0 };
    const teacherLabel = teacherName ? `Ustadh/Ustadha ${teacherName}` : 'Your teacher';
    const bodyHtml = body.replace(/\n/g, '<br>');
    const { gmailUser, gmailPass } = getCfg();
    let emailsSent = 0;
    for (const parentEmail of parentEmails) {
        try {
            await sendEmail({
                user: gmailUser,
                pass: gmailPass,
                to: parentEmail,
                subject: `New Announcement — ${className}`,
                html: `
          <p>As-salamu alaykum,</p>
          <p>${teacherLabel} has posted a new announcement for <strong>${className}</strong>:</p>
          <div style="background:#f5f5f0;border-left:4px solid #7a9e7e;padding:12px 16px;margin:16px 0;border-radius:4px">
            <p style="margin:0 0 6px 0;font-weight:600">${title}</p>
            <p style="margin:0;color:#444">${bodyHtml}</p>
          </div>
          <p><a href="https://aimava.org/portal/parent">View in Parent Portal →</a></p>
          <p style="color:#888;font-size:12px;">Anas Ibn Malik Academy</p>
        `,
            });
            emailsSent++;
        }
        catch (err) {
            console.error(`Failed to email ${parentEmail}:`, err);
        }
    }
    return { success: true, emailsSent };
});
/** Reject a pending family registration with an optional reason. */
exports.rejectRegistration = v1_1.https.onCall(async (data, context) => {
    var _a, _b;
    if (((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Only admins can reject registrations.');
    }
    const { registrationId, reason = '' } = data;
    if (!registrationId)
        throw new v1_1.https.HttpsError('invalid-argument', 'registrationId is required.');
    const db = (0, firestore_1.getFirestore)();
    const regRef = db.collection('registrations').doc(registrationId);
    const regDoc = await regRef.get();
    if (!regDoc.exists)
        throw new v1_1.https.HttpsError('not-found', 'Registration not found.');
    const reg = regDoc.data();
    await regRef.update({
        status: 'rejected',
        rejectReason: reason,
        reviewedAt: new Date().toISOString(),
        reviewedBy: context.auth.uid,
    });
    // Notify parent
    const { gmailUser, gmailPass } = getCfg();
    try {
        await sendEmail({
            user: gmailUser,
            pass: gmailPass,
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
// ── notifyMissedWorkParent ────────────────────────────────────────────────────
// Teacher/admin: sends parent an email about their child's missed work.
exports.notifyMissedWorkParent = v1_1.https.onCall(async (data, context) => {
    var _a;
    const db = (0, firestore_1.getFirestore)();
    if (!context.auth)
        throw new v1_1.https.HttpsError('unauthenticated', 'Must be signed in.');
    const role = (_a = context.auth.token) === null || _a === void 0 ? void 0 : _a.role;
    if (role !== 'teacher' && role !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Teachers and admins only.');
    }
    const { missedWorkId } = data;
    if (!missedWorkId)
        throw new v1_1.https.HttpsError('invalid-argument', 'missedWorkId required.');
    const mwDoc = await db.collection('missedWork').doc(missedWorkId).get();
    if (!mwDoc.exists)
        throw new v1_1.https.HttpsError('not-found', 'Missed work record not found.');
    const mw = mwDoc.data();
    // Look up student to get parent email
    const stuDoc = await db.collection('students').doc(mw.studentId).get();
    if (!stuDoc.exists)
        throw new v1_1.https.HttpsError('not-found', 'Student not found.');
    const stu = stuDoc.data();
    const parentEmail = stu.parentEmail;
    if (!parentEmail)
        return { success: false, reason: 'No parent email on file.' };
    const dateStr = new Date(mw.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const what = [];
    if (mw.missedLesson)
        what.push('Islamic Studies Lesson');
    if (mw.missedHomework)
        what.push('Islamic Studies Homework/Worksheet');
    const { gmailUser, gmailPass } = getCfg();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
    });
    await transporter.sendMail({
        from: `"AIM Academy" <${gmailUser}>`,
        to: parentEmail,
        subject: `Missed Work — ${mw.studentName} — ${mw.className}`,
        html: `
      <p>As-salamu alaykum <strong>${stu.parentName || 'Dear Parent'}</strong>,</p>
      <p>This is a reminder that <strong>${mw.studentName}</strong> was absent from <strong>${mw.className}</strong> on <strong>${dateStr}</strong>.</p>
      ${what.length > 0 ? `
      <p><strong>What was missed:</strong></p>
      <ul>${what.map(w => `<li>${w}</li>`).join('')}</ul>
      ` : ''}
      ${mw.missedWorkNotes ? `<p><strong>Teacher's notes:</strong><br/>${mw.missedWorkNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      <p>Please reach out to the teacher if you have any questions.</p>
      <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br/>Anas Ibn Malik Academy</p>
    `,
    });
    return { success: true };
});
// ── notifyCaughtUpParent ──────────────────────────────────────────────────────
// Teacher/admin: sends parent an email confirming their child caught up on missed work.
exports.notifyCaughtUpParent = v1_1.https.onCall(async (data, context) => {
    const db = (0, firestore_1.getFirestore)();
    if (!context.auth)
        throw new v1_1.https.HttpsError('unauthenticated', 'Must be signed in.');
    const role = context.auth.token['role'];
    if (role !== 'teacher' && role !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Teachers and admins only.');
    }
    const { missedWorkId } = data;
    if (!missedWorkId)
        throw new v1_1.https.HttpsError('invalid-argument', 'missedWorkId required.');
    const mwDoc = await db.collection('missedWork').doc(missedWorkId).get();
    if (!mwDoc.exists)
        throw new v1_1.https.HttpsError('not-found', 'Missed work record not found.');
    const mw = mwDoc.data();
    const stuDoc = await db.collection('students').doc(mw.studentId).get();
    if (!stuDoc.exists)
        throw new v1_1.https.HttpsError('not-found', 'Student not found.');
    const stu = stuDoc.data();
    const parentEmail = stu.parentEmail;
    if (!parentEmail)
        return { success: false, reason: 'No parent email on file.' };
    const dateStr = new Date(mw.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const what = [];
    if (mw.missedLesson)
        what.push('Islamic Studies Lesson');
    if (mw.missedHomework)
        what.push('Islamic Studies Homework/Worksheet');
    const { gmailUser, gmailPass } = getCfg();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
    });
    await transporter.sendMail({
        from: `"AIM Academy" <${gmailUser}>`,
        to: parentEmail,
        subject: `Caught Up — ${mw.studentName} — ${mw.className}`,
        html: `
      <p>As-salamu alaykum <strong>${stu.parentName || 'Dear Parent'}</strong>,</p>
      <p>Great news! <strong>${mw.studentName}</strong> has caught up on the work missed from <strong>${mw.className}</strong> on <strong>${dateStr}</strong>.</p>
      ${what.length > 0 ? `
      <p><strong>Work completed:</strong></p>
      <ul>${what.map(w => `<li>${w}</li>`).join('')}</ul>
      ` : ''}
      ${mw.missedWorkNotes ? `<p><strong>Teacher's notes:</strong><br/>${mw.missedWorkNotes.replace(/\n/g, '<br/>')}</p>` : ''}
      <p style="color:#888;font-size:12px;">Jazak Allah khayran,<br/>Anas Ibn Malik Academy</p>
    `,
    });
    return { success: true };
});
// ── seedDatabase ──────────────────────────────────────────────────────────────
// Admin-only: writes realistic test data (classes, students, attendance, etc.)
// All documents use "seed_" prefixed IDs so they can be cleared without risk.
exports.seedDatabase = v1_1.https.onCall(async (_data, context) => {
    var _a;
    const db = (0, firestore_1.getFirestore)();
    if (!context.auth)
        throw new v1_1.https.HttpsError('unauthenticated', 'Must be signed in.');
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || ((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Admin only.');
    }
    const TEACHER = {
        ibrahim: { uid: 'seed_teacher_ibrahim', name: 'Ibrahim Khan' },
        zainab: { uid: 'seed_teacher_zainab', name: 'Zainab Malik' },
        ahmad: { uid: 'seed_teacher_ahmad', name: 'Ahmad Siddiqui' },
    };
    const CLS = {
        hifz: 'seed_cls_hifz',
        qaidah: 'seed_cls_qaidah',
        is3: 'seed_cls_is3',
        tajweed: 'seed_cls_tajweed',
    };
    const classes = [
        { id: CLS.hifz, name: 'Hifz', description: 'Quran memorization for advanced students', teacherUid: TEACHER.ibrahim.uid, teacherName: TEACHER.ibrahim.name, schedule: 'Saturday 9:00am–11:00am', tuitionAmount: 15000, nextReportDeadline: '2026-11-07', createdAt: '2026-09-01T00:00:00.000Z' },
        { id: CLS.qaidah, name: "Noorani Qa'idah", description: "Foundational Arabic reading using the Noorani Qa'idah method", teacherUid: TEACHER.zainab.uid, teacherName: TEACHER.zainab.name, schedule: 'Saturday 11:00am–12:30pm', tuitionAmount: 12000, nextReportDeadline: '2026-11-14', createdAt: '2026-09-01T00:00:00.000Z' },
        { id: CLS.is3, name: 'Islamic Studies Grade 3', description: 'Aqeedah, Fiqh, Seerah, and Akhlaq for Grade 3 students', teacherUid: TEACHER.ahmad.uid, teacherName: TEACHER.ahmad.name, schedule: 'Saturday 12:30pm–2:00pm', tuitionAmount: 12000, createdAt: '2026-09-01T00:00:00.000Z' },
        { id: CLS.tajweed, name: 'Quran Recitation (Tajweed)', description: 'Quran recitation with proper Tajweed rules for intermediate students', teacherUid: TEACHER.zainab.uid, teacherName: TEACHER.zainab.name, schedule: 'Saturday 2:00pm–3:30pm', tuitionAmount: 14000, createdAt: '2026-09-01T00:00:00.000Z' },
    ];
    const students = [
        { id: 'seed_stu_omar', firstName: 'Omar', lastName: 'Abdullah', classIds: [CLS.hifz], tuitionAmount: 15000, parentName: 'Khalid Abdullah', parentEmail: 'khalid.abdullah@seedtest.com', parentPhone: '(571) 555-0101' },
        { id: 'seed_stu_aisha', firstName: 'Aisha', lastName: 'Rahman', classIds: [CLS.hifz], tuitionAmount: 15000, parentName: 'Hassan Rahman', parentEmail: 'hassan.rahman@seedtest.com', parentPhone: '(571) 555-0102' },
        { id: 'seed_stu_yusuf', firstName: 'Yusuf', lastName: 'Al-Amin', classIds: [CLS.hifz], tuitionAmount: 15000, parentName: 'Bilal Al-Amin', parentEmail: 'bilal.alamin@seedtest.com', parentPhone: '(571) 555-0103' },
        { id: 'seed_stu_maryam', firstName: 'Maryam', lastName: 'Hossain', classIds: [CLS.hifz], tuitionAmount: 15000, parentName: 'Tariq Hossain', parentEmail: 'tariq.hossain@seedtest.com', parentPhone: '(571) 555-0104' },
        { id: 'seed_stu_zayd', firstName: 'Zayd', lastName: 'Nasser', classIds: [CLS.qaidah], tuitionAmount: 12000, parentName: 'Amira Nasser', parentEmail: 'amira.nasser@seedtest.com', parentPhone: '(571) 555-0201' },
        { id: 'seed_stu_fatima', firstName: 'Fatima', lastName: 'Osman', classIds: [CLS.qaidah], tuitionAmount: 12000, parentName: 'Yusuf Osman', parentEmail: 'yusuf.osman@seedtest.com', parentPhone: '(571) 555-0202' },
        { id: 'seed_stu_ibrahim', firstName: 'Ibrahim', lastName: 'Malik', classIds: [CLS.qaidah], tuitionAmount: 12000, parentName: 'Layla Malik', parentEmail: 'layla.malik@seedtest.com', parentPhone: '(571) 555-0203' },
        { id: 'seed_stu_khadija', firstName: 'Khadijah', lastName: 'Hussain', classIds: [CLS.qaidah], tuitionAmount: 12000, parentName: 'Ahmed Hussain', parentEmail: 'ahmed.hussain@seedtest.com', parentPhone: '(571) 555-0204' },
        { id: 'seed_stu_ali', firstName: 'Ali', lastName: 'Karimi', classIds: [CLS.qaidah], tuitionAmount: 12000, parentName: 'Sara Karimi', parentEmail: 'sara.karimi@seedtest.com', parentPhone: '(571) 555-0205' },
        { id: 'seed_stu_sara', firstName: 'Sara', lastName: 'Ahmed', classIds: [CLS.is3], tuitionAmount: 12000, parentName: 'Nadia Ahmed', parentEmail: 'nadia.ahmed@seedtest.com', parentPhone: '(571) 555-0301' },
        { id: 'seed_stu_hassan', firstName: 'Hassan', lastName: 'Qureshi', classIds: [CLS.is3], tuitionAmount: 12000, parentName: 'Imran Qureshi', parentEmail: 'imran.qureshi@seedtest.com', parentPhone: '(571) 555-0302' },
        { id: 'seed_stu_zainab', firstName: 'Zainab', lastName: 'Farooq', classIds: [CLS.is3], tuitionAmount: 12000, parentName: 'Khalid Farooq', parentEmail: 'khalid.farooq@seedtest.com', parentPhone: '(571) 555-0303' },
        { id: 'seed_stu_adam', firstName: 'Adam', lastName: 'Nasir', classIds: [CLS.is3], tuitionAmount: 12000, parentName: 'Rania Nasir', parentEmail: 'rania.nasir@seedtest.com', parentPhone: '(571) 555-0304' },
        { id: 'seed_stu_noor', firstName: 'Noor', lastName: 'Siddiqui', classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Amna Siddiqui', parentEmail: 'amna.siddiqui@seedtest.com', parentPhone: '(571) 555-0401' },
        { id: 'seed_stu_bilal', firstName: 'Bilal', lastName: 'Chaudhry', classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Zara Chaudhry', parentEmail: 'zara.chaudhry@seedtest.com', parentPhone: '(571) 555-0402' },
        { id: 'seed_stu_hana', firstName: 'Hana', lastName: 'Al-Rashid', classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Faisal Al-Rashid', parentEmail: 'faisal.alrashid@seedtest.com', parentPhone: '(571) 555-0403' },
        { id: 'seed_stu_umar', firstName: 'Umar', lastName: 'Patel', classIds: [CLS.tajweed], tuitionAmount: 14000, parentName: 'Safia Patel', parentEmail: 'safia.patel@seedtest.com', parentPhone: '(571) 555-0404' },
    ].map(s => (Object.assign(Object.assign({}, s), { notes: '', createdAt: '2026-09-01T00:00:00.000Z' })));
    const hifzStus = students.filter(s => s.classIds.includes(CLS.hifz));
    const qaidahStus = students.filter(s => s.classIds.includes(CLS.qaidah));
    const is3Stus = students.filter(s => s.classIds.includes(CLS.is3));
    const tajweedStus = students.filter(s => s.classIds.includes(CLS.tajweed));
    function mkSession(classId, date, stuList, presentIds) {
        var _a, _b;
        return {
            classId, date,
            records: stuList.map(s => ({
                studentId: s.id,
                studentName: `${s.firstName} ${s.lastName}`,
                status: presentIds.includes(s.id) ? 'present' : 'absent',
            })),
            createdBy: (_b = (_a = classes.find(c => c.id === classId)) === null || _a === void 0 ? void 0 : _a.teacherUid) !== null && _b !== void 0 ? _b : '',
            createdAt: `${date}T10:00:00.000Z`,
        };
    }
    const attendance = [
        Object.assign({ id: `${CLS.hifz}_2026-10-11` }, mkSession(CLS.hifz, '2026-10-11', hifzStus, ['seed_stu_omar', 'seed_stu_aisha', 'seed_stu_yusuf'])),
        Object.assign({ id: `${CLS.hifz}_2026-10-18` }, mkSession(CLS.hifz, '2026-10-18', hifzStus, ['seed_stu_omar', 'seed_stu_aisha', 'seed_stu_yusuf', 'seed_stu_maryam'])),
        Object.assign({ id: `${CLS.hifz}_2026-10-25` }, mkSession(CLS.hifz, '2026-10-25', hifzStus, ['seed_stu_aisha', 'seed_stu_yusuf', 'seed_stu_maryam'])),
        Object.assign({ id: `${CLS.qaidah}_2026-10-11` }, mkSession(CLS.qaidah, '2026-10-11', qaidahStus, ['seed_stu_zayd', 'seed_stu_fatima', 'seed_stu_ibrahim', 'seed_stu_khadija'])),
        Object.assign({ id: `${CLS.qaidah}_2026-10-18` }, mkSession(CLS.qaidah, '2026-10-18', qaidahStus, ['seed_stu_zayd', 'seed_stu_fatima', 'seed_stu_ibrahim', 'seed_stu_khadija', 'seed_stu_ali'])),
        Object.assign({ id: `${CLS.qaidah}_2026-10-25` }, mkSession(CLS.qaidah, '2026-10-25', qaidahStus, ['seed_stu_zayd', 'seed_stu_fatima', 'seed_stu_khadija', 'seed_stu_ali'])),
        Object.assign({ id: `${CLS.is3}_2026-10-11` }, mkSession(CLS.is3, '2026-10-11', is3Stus, ['seed_stu_sara', 'seed_stu_hassan', 'seed_stu_zainab'])),
        Object.assign({ id: `${CLS.is3}_2026-10-18` }, mkSession(CLS.is3, '2026-10-18', is3Stus, ['seed_stu_sara', 'seed_stu_hassan', 'seed_stu_zainab', 'seed_stu_adam'])),
        Object.assign({ id: `${CLS.is3}_2026-10-25` }, mkSession(CLS.is3, '2026-10-25', is3Stus, ['seed_stu_sara', 'seed_stu_zainab', 'seed_stu_adam'])),
        Object.assign({ id: `${CLS.tajweed}_2026-10-11` }, mkSession(CLS.tajweed, '2026-10-11', tajweedStus, ['seed_stu_noor', 'seed_stu_bilal', 'seed_stu_hana', 'seed_stu_umar'])),
        Object.assign({ id: `${CLS.tajweed}_2026-10-18` }, mkSession(CLS.tajweed, '2026-10-18', tajweedStus, ['seed_stu_noor', 'seed_stu_hana', 'seed_stu_umar'])),
        Object.assign({ id: `${CLS.tajweed}_2026-10-25` }, mkSession(CLS.tajweed, '2026-10-25', tajweedStus, ['seed_stu_noor', 'seed_stu_bilal', 'seed_stu_hana', 'seed_stu_umar'])),
    ];
    const progress = [
        { id: `${CLS.hifz}__seed_stu_omar`, classId: CLS.hifz, studentId: 'seed_stu_omar', quranPosition: 'Surah Al-Mulk (67), Ayah 18', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Strong memorization, needs to work on tajweed', updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
        { id: `${CLS.hifz}__seed_stu_aisha`, classId: CLS.hifz, studentId: 'seed_stu_aisha', quranPosition: 'Surah Al-Qalam (68), Ayah 5', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Excellent progress, ahead of schedule', updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
        { id: `${CLS.hifz}__seed_stu_yusuf`, classId: CLS.hifz, studentId: 'seed_stu_yusuf', quranPosition: 'Surah Al-Haqqah (69), Ayah 1', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 5', notes: 'Good retention, occasional pronunciation errors', updatedAt: '2026-10-18T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
        { id: `${CLS.hifz}__seed_stu_maryam`, classId: CLS.hifz, studentId: 'seed_stu_maryam', quranPosition: 'Surah Al-Maarij (70), Ayah 10', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Needs more revision of Juz 29', updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
        { id: `${CLS.qaidah}__seed_stu_zayd`, classId: CLS.qaidah, studentId: 'seed_stu_zayd', quranPosition: '', qaidahPosition: "Noorani Qa'idah Page 18", islamicStudiesLevel: 'Grade 1', notes: 'Good progress, needs practice with compound letters', updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.qaidah}__seed_stu_fatima`, classId: CLS.qaidah, studentId: 'seed_stu_fatima', quranPosition: '', qaidahPosition: "Noorani Qa'idah Page 22", islamicStudiesLevel: 'Grade 2', notes: 'Excellent, ahead of class', updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.qaidah}__seed_stu_ibrahim`, classId: CLS.qaidah, studentId: 'seed_stu_ibrahim', quranPosition: '', qaidahPosition: "Noorani Qa'idah Page 14", islamicStudiesLevel: 'Grade 1', notes: 'Slow but steady, extra practice recommended', updatedAt: '2026-10-18T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.qaidah}__seed_stu_khadija`, classId: CLS.qaidah, studentId: 'seed_stu_khadija', quranPosition: '', qaidahPosition: "Noorani Qa'idah Page 20", islamicStudiesLevel: 'Grade 2', notes: 'Good, tanween still needs work', updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.qaidah}__seed_stu_ali`, classId: CLS.qaidah, studentId: 'seed_stu_ali', quranPosition: '', qaidahPosition: "Noorani Qa'idah Page 16", islamicStudiesLevel: 'Grade 1', notes: 'Needs encouragement, making progress', updatedAt: '2026-10-25T12:00:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.is3}__seed_stu_sara`, classId: CLS.is3, studentId: 'seed_stu_sara', quranPosition: 'Surah Al-Fatiha — Memorized', qaidahPosition: "Qa'idah Complete", islamicStudiesLevel: 'Grade 3, Chapter 4', notes: 'Strong student, participates well', updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.is3}__seed_stu_hassan`, classId: CLS.is3, studentId: 'seed_stu_hassan', quranPosition: 'Surah Al-Fatiha — Memorized', qaidahPosition: "Qa'idah Complete", islamicStudiesLevel: 'Grade 3, Chapter 3', notes: 'Needs help with Salah chapter', updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.is3}__seed_stu_zainab`, classId: CLS.is3, studentId: 'seed_stu_zainab', quranPosition: 'Surah Al-Ikhlas — Memorized', qaidahPosition: "Qa'idah Page 30", islamicStudiesLevel: 'Grade 3, Chapter 4', notes: 'Very attentive and asks great questions', updatedAt: '2026-10-18T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.is3}__seed_stu_adam`, classId: CLS.is3, studentId: 'seed_stu_adam', quranPosition: 'Surah Al-Fatiha — Memorized', qaidahPosition: "Qa'idah Page 25", islamicStudiesLevel: 'Grade 3, Chapter 3', notes: 'Improving steadily', updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.tajweed}__seed_stu_noor`, classId: CLS.tajweed, studentId: 'seed_stu_noor', quranPosition: 'Surah Yaseen — Ikhfa rules', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Beautiful recitation, almost ready for Juz 1 review', updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.tajweed}__seed_stu_bilal`, classId: CLS.tajweed, studentId: 'seed_stu_bilal', quranPosition: 'Surah Al-Baqarah — Idgham rules', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Working on Idgham, good overall', updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.tajweed}__seed_stu_hana`, classId: CLS.tajweed, studentId: 'seed_stu_hana', quranPosition: 'Surah Al-Imran — Qalqalah practice', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 3', notes: 'Qalqalah improving, consistent effort', updatedAt: '2026-10-18T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.tajweed}__seed_stu_umar`, classId: CLS.tajweed, studentId: 'seed_stu_umar', quranPosition: 'Surah An-Nisa — Madd rules', qaidahPosition: 'Completed', islamicStudiesLevel: 'Grade 4', notes: 'Strong madd pronunciation, keep it up', updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
    ];
    const homework = [
        { id: `${CLS.is3}__2026-W42`, classId: CLS.is3, week: '2026-W42', completed: { seed_stu_sara: true, seed_stu_hassan: false, seed_stu_zainab: true, seed_stu_adam: true }, updatedAt: '2026-10-18T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.is3}__2026-W43`, classId: CLS.is3, week: '2026-W43', completed: { seed_stu_sara: true, seed_stu_hassan: true, seed_stu_zainab: true, seed_stu_adam: false }, updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.hifz}__2026-W42`, classId: CLS.hifz, week: '2026-W42', completed: { seed_stu_omar: true, seed_stu_aisha: true, seed_stu_yusuf: true, seed_stu_maryam: false }, updatedAt: '2026-10-18T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
        { id: `${CLS.hifz}__2026-W43`, classId: CLS.hifz, week: '2026-W43', completed: { seed_stu_omar: true, seed_stu_aisha: true, seed_stu_yusuf: false, seed_stu_maryam: true }, updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
        { id: `${CLS.tajweed}__2026-W42`, classId: CLS.tajweed, week: '2026-W42', completed: { seed_stu_noor: true, seed_stu_bilal: true, seed_stu_hana: false, seed_stu_umar: true }, updatedAt: '2026-10-18T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
        { id: `${CLS.tajweed}__2026-W43`, classId: CLS.tajweed, week: '2026-W43', completed: { seed_stu_noor: true, seed_stu_bilal: false, seed_stu_hana: true, seed_stu_umar: true }, updatedAt: '2026-10-25T14:30:00.000Z', updatedBy: TEACHER.zainab.uid },
    ];
    const quizResults = [
        { id: `${CLS.is3}__2026-10`, classId: CLS.is3, month: '2026-10', maxScore: 20, scores: { seed_stu_sara: 18, seed_stu_hassan: 14, seed_stu_zainab: 19, seed_stu_adam: 16 }, updatedAt: '2026-10-25T13:30:00.000Z', updatedBy: TEACHER.ahmad.uid },
        { id: `${CLS.hifz}__2026-10`, classId: CLS.hifz, month: '2026-10', maxScore: 10, scores: { seed_stu_omar: 9, seed_stu_aisha: 10, seed_stu_yusuf: 8, seed_stu_maryam: 7 }, updatedAt: '2026-10-25T11:00:00.000Z', updatedBy: TEACHER.ibrahim.uid },
    ];
    const announcements = [
        { id: 'seed_ann_hifz_1', title: 'Juz 29 Revision This Saturday', body: "As-salamu alaykum dear parents,\n\nThis Saturday we will be doing a full revision of Juz 29.", classId: CLS.hifz, className: 'Hifz', authorUid: TEACHER.ibrahim.uid, authorName: TEACHER.ibrahim.name, createdAt: '2026-10-22T10:00:00.000Z', published: true },
        { id: 'seed_ann_hifz_2', title: 'Mid-Year Progress Reports — Nov 7', body: "As-salamu alaykum,\n\nProgress reports for the Hifz class are due by November 7th.", classId: CLS.hifz, className: 'Hifz', authorUid: TEACHER.ibrahim.uid, authorName: TEACHER.ibrahim.name, createdAt: '2026-10-15T10:00:00.000Z', published: true },
        { id: 'seed_ann_qaidah_1', title: "Practice Letters 10–15 This Week", body: "As-salamu alaykum,\n\nWe covered letters 10–15 in the Noorani Qa'idah this Saturday.", classId: CLS.qaidah, className: "Noorani Qa'idah", authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name, createdAt: '2026-10-25T13:00:00.000Z', published: true },
        { id: 'seed_ann_qaidah_2', title: 'Class Starting 15 Minutes Late Nov 1', body: "As-salamu alaykum,\n\nThe Noorani Qa'idah class on November 1st will start at 11:15am.", classId: CLS.qaidah, className: "Noorani Qa'idah", authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name, createdAt: '2026-10-20T09:00:00.000Z', published: true },
        { id: 'seed_ann_is3_1', title: 'Chapter 4 Quiz Next Saturday', body: "As-salamu alaykum,\n\nWe will have a short quiz on Chapter 4 (The Five Pillars) next Saturday.", classId: CLS.is3, className: 'Islamic Studies Grade 3', authorUid: TEACHER.ahmad.uid, authorName: TEACHER.ahmad.name, createdAt: '2026-10-21T12:00:00.000Z', published: true },
        { id: 'seed_ann_tajweed_1', title: 'Ikhfa and Idgham Review', body: "As-salamu alaykum dear parents,\n\nThis week we focused on Ikhfa and Idgham rules.", classId: CLS.tajweed, className: 'Quran Recitation (Tajweed)', authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name, createdAt: '2026-10-25T15:00:00.000Z', published: true },
        { id: 'seed_ann_tajweed_2', title: 'No Class on November 8th', body: "As-salamu alaykum,\n\nNo Tajweed class on November 8th due to a community event. Resumes Nov 15.", classId: CLS.tajweed, className: 'Quran Recitation (Tajweed)', authorUid: TEACHER.zainab.uid, authorName: TEACHER.zainab.name, createdAt: '2026-10-18T15:00:00.000Z', published: true },
    ];
    // Write in batches (Firestore limit: 500 ops per batch)
    const allDocs = [
        ...classes.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'classes', id, data: d });
        }),
        ...students.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'students', id, data: d });
        }),
        ...attendance.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'attendance', id, data: d });
        }),
        ...progress.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'studentProgress', id, data: d });
        }),
        ...homework.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'weeklyHomework', id, data: d });
        }),
        ...quizResults.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'quizResults', id, data: d });
        }),
        ...announcements.map((_a) => {
            var { id } = _a, d = __rest(_a, ["id"]);
            return ({ col: 'announcements', id, data: d });
        }),
    ];
    const batch = db.batch();
    for (const { col, id, data } of allDocs)
        batch.set(db.collection(col).doc(id), data);
    await batch.commit();
    return {
        success: true,
        counts: {
            classes: classes.length,
            students: students.length,
            attendance: attendance.length,
            progress: progress.length,
            homework: homework.length,
            quizResults: quizResults.length,
            announcements: announcements.length,
        },
    };
});
// ── clearSeedData ─────────────────────────────────────────────────────────────
// Admin-only: deletes all documents whose ID starts with "seed_"
exports.clearSeedData = v1_1.https.onCall(async (_data, context) => {
    var _a;
    const db = (0, firestore_1.getFirestore)();
    if (!context.auth)
        throw new v1_1.https.HttpsError('unauthenticated', 'Must be signed in.');
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || ((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new v1_1.https.HttpsError('permission-denied', 'Admin only.');
    }
    const collections = ['classes', 'students', 'attendance', 'studentProgress', 'weeklyHomework', 'quizResults', 'announcements', 'missedWork'];
    let deleted = 0;
    for (const col of collections) {
        const snap = await db.collection(col).get();
        const seedDocs = snap.docs.filter(d => d.id.startsWith('seed_'));
        if (seedDocs.length > 0) {
            const batch = db.batch();
            for (const d of seedDocs)
                batch.delete(d.ref);
            await batch.commit();
            deleted += seedDocs.length;
        }
    }
    return { success: true, deleted };
});
//# sourceMappingURL=index.js.map