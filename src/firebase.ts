import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const USE_EMULATOR = import.meta.env.VITE_USE_EMULATOR === 'true'

const firebaseConfig = USE_EMULATOR
  ? {
      // Emulator uses a local project — real API key not needed
      apiKey: 'emulator-fake-api-key',
      authDomain: 'localhost',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'aim-academy-7fdae',
      storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'aim-academy-7fdae'}.appspot.com`,
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:0000000000000000',
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    }

export const app = initializeApp(firebaseConfig)
export const analytics = USE_EMULATOR ? null : getAnalytics(app)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

if (USE_EMULATOR) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8081)
  connectStorageEmulator(storage, 'localhost', 9199)
  connectFunctionsEmulator(functions, 'localhost', 5001)
}
