import type { Session } from '@supabase/supabase-js'

import { supabase } from './supabase'

let anonymousSessionPromise: Promise<Session> | null = null

export function ensureAnonymousSession(): Promise<Session> {
  if (anonymousSessionPromise) {
    return anonymousSessionPromise
  }

  anonymousSessionPromise = (async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      throw sessionError
    }

    if (session) {
      return session
    }

    const {
      data: { session: anonymousSession },
      error: signInError,
    } = await supabase.auth.signInAnonymously()

    if (signInError) {
      throw signInError
    }

    if (!anonymousSession) {
      throw new Error(
        'Anonymous sign-in succeeded without returning a session.',
      )
    }

    return anonymousSession
  })().catch((error) => {
    anonymousSessionPromise = null
    throw error
  })

  return anonymousSessionPromise
}
