export interface ImpersonationState {
  uid: string
  email: string
  role: string
  displayName: string
}

export function getImpersonation(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem('impersonating')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearImpersonation() {
  sessionStorage.removeItem('impersonating')
}

export default function ImpersonationBanner({ state }: { state: ImpersonationState }) {
  function exit() {
    clearImpersonation()
    window.location.href = '/admin'
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-amber-500 text-white px-5 py-3 flex items-center justify-between gap-4 shadow-xl">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg flex-shrink-0">👁</span>
        <div className="min-w-0">
          <span className="font-semibold text-sm">Impersonating</span>
          <span className="ml-2 text-sm opacity-90 truncate">{state.displayName}</span>
          <span className="ml-1 text-xs opacity-70">({state.email})</span>
        </div>
      </div>
      <button
        onClick={exit}
        className="flex-shrink-0 bg-white text-amber-700 font-bold text-xs px-4 py-1.5 rounded-full hover:bg-amber-50 transition"
      >
        Exit Impersonation
      </button>
    </div>
  )
}
