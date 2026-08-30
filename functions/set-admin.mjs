/**
 * Bootstrap script: sets the admin custom claim on an existing Firebase Auth user.
 * Run this once before deploying the role-based auth system.
 *
 * Usage:
 *   ADMIN_EMAIL=aimacademyva@gmail.com node scripts/set-admin.mjs
 *   ADMIN_EMAIL=aimacademyva@gmail.com PROJECT_ID=aim-academy-prod node scripts/set-admin.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.PROJECT_ID || 'aim-academy-7fdae'
const adminEmail = process.env.ADMIN_EMAIL

if (!adminEmail) {
  console.error('Error: ADMIN_EMAIL environment variable is required.')
  console.error('Usage: ADMIN_EMAIL=you@example.com node scripts/set-admin.mjs')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({ projectId })
}

const adminAuth = getAuth()
const db = getFirestore()

async function bootstrap() {
  console.log(`Project: ${projectId}`)
  console.log(`Setting admin claim on: ${adminEmail}`)

  let user
  try {
    user = await adminAuth.getUserByEmail(adminEmail)
  } catch {
    console.error(`No Firebase Auth user found with email: ${adminEmail}`)
    console.error('Create the user in Firebase Console first, then re-run this script.')
    process.exit(1)
  }

  await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' })
  console.log(`✓ Custom claim set: { role: 'admin' }`)

  await db.collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName || 'Admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
    invitedBy: null,
  }, { merge: true })
  console.log(`✓ Written to users/${user.uid}`)

  console.log('\nDone! The user must sign out and sign back in for the claim to take effect.')
  process.exit(0)
}

bootstrap().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
