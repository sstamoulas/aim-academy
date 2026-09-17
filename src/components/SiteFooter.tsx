import { useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase'

export default function SiteFooter() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setCurrentUser(u)
      if (u) {
        const token = await u.getIdTokenResult()
        setUserRole(token.claims['role'] as string ?? null)
      } else {
        setUserRole(null)
      }
    })
  }, [])

  const portalHref = userRole === 'admin' ? '/admin' : userRole === 'teacher' ? '/portal/teacher' : '/portal/parent'

  return (
    <footer className="border-t border-stone-200/70 mt-auto px-6 lg:px-8 py-10 font-quick">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AIM Academy" className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shadow-sm" />
            <div>
              <div className="font-kids text-base text-wood-dark leading-none">AIM Academy</div>
              <div className="text-xs text-stone-400 mt-0.5">Anas Ibn Malik Academy</div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
            <a href="/#dc-about" className="hover:text-wood-dark transition">About</a>
            <a href="/#dc-programs" className="hover:text-wood-dark transition">Programs</a>
            <a href="/contact" className="hover:text-wood-dark transition">Events</a>
            <a href="/#dc-achievements" className="hover:text-wood-dark transition">Achievements</a>
            <a href="/contact" className="hover:text-wood-dark transition">Contact</a>
            {currentUser
              ? <a href={portalHref} className="hover:text-wood-dark transition">My Portal</a>
              : <a href="/portal/register" className="hover:text-wood-dark transition">Register</a>
            }
          </nav>
        </div>
        <div className="mt-6 text-xs text-stone-400">
          © {new Date().getFullYear()} Anas Ibn Malik Academy. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
