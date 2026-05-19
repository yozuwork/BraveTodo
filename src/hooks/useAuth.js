import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'

const ALLOWED_AUTH_UID = import.meta.env.VITE_ALLOWED_AUTH_UID?.trim()
const UNAUTHORIZED_MESSAGE = '這個 App 只允許指定的 Google 帳號登入。'

function createGoogleProvider({ selectAccount = false } = {}) {
  const provider = new GoogleAuthProvider()
  if (selectAccount) {
    provider.setCustomParameters({ prompt: 'select_account' })
  }
  return provider
}

function isAllowedUser(user) {
  return !ALLOWED_AUTH_UID || user?.uid === ALLOWED_AUTH_UID
}

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && !isAllowedUser(u)) {
        setUser(null)
        setAuthError(UNAUTHORIZED_MESSAGE)
        setLoading(false)
        signOut(auth).catch(() => {})
        return
      }
      setUser(u)
      if (u) setAuthError('')
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async (options) => {
    setAuthError('')
    try {
      const result = await signInWithPopup(auth, createGoogleProvider(options))
      if (!isAllowedUser(result.user)) {
        await signOut(auth)
        setUser(null)
        setAuthError(UNAUTHORIZED_MESSAGE)
        return null
      }
      return result
    } catch (error) {
      if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
        setAuthError(error?.message ?? '登入失敗，請再試一次。')
      }
      return null
    }
  }
  const logOut = () => {
    setAuthError('')
    return signOut(auth)
  }

  return { user, loading, signIn, logOut, authError }
}
