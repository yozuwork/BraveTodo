import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'

function createGoogleProvider({ selectAccount = false } = {}) {
  const provider = new GoogleAuthProvider()
  if (selectAccount) {
    provider.setCustomParameters({ prompt: 'select_account' })
  }
  return provider
}

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = (options) => signInWithPopup(auth, createGoogleProvider(options))
  const logOut = () => signOut(auth)

  return { user, loading, signIn, logOut }
}
