import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyAS2GYoUEPgAj44pCdwPZIyqdwTSqBpiwM",
  authDomain: "aim-academy-7fdae.firebaseapp.com",
  projectId: "aim-academy-7fdae",
  storageBucket: "aim-academy-7fdae.firebasestorage.app",
  messagingSenderId: "505654633826",
  appId: "1:505654633826:web:9894248750129241d7f83b",
  measurementId: "G-00PXRRH515"
}

export const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
