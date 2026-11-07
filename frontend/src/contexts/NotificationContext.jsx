import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { getMyDocuments, getSharedWithMe, getSharedByMe } from '../api/documents.js'
import { getMyFileRequests, getAllFileRequests } from '../api/requests.js'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user, isAdmin } = useAuth()
  const [unreadCounts, setUnreadCounts] = useState({
    documents: 0,
    sharedWithMe: 0,
    sharedByMe: 0,
    requests: 0
  })

  // In-memory cache of current items to check freshness
  const [itemsCache, setItemsCache] = useState({
    documents: [],
    sharedWithMe: [],
    sharedByMe: [],
    requests: []
  })

  const userEmail = user?.email || ''

  const getLastSeen = useCallback((section) => {
    if (!userEmail) return Date.now()
    const val = localStorage.getItem(`tv_seen_${userEmail}_${section}`)
    if (!val) {
      // Default to 1 hour ago if first visit so brand new additions/updates stand out
      const defaultTime = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      localStorage.setItem(`tv_seen_${userEmail}_${section}`, defaultTime)
      return new Date(defaultTime).getTime()
    }
    return new Date(val).getTime()
  }, [userEmail])

  const refreshCounts = useCallback(async () => {
    if (!userEmail) {
      setUnreadCounts({ documents: 0, sharedWithMe: 0, sharedByMe: 0, requests: 0 })
      return
    }

    try {
      const [myDocsRes, sharedMeRes, sharedByRes, reqsRes] = await Promise.allSettled([
        getMyDocuments(),
        getSharedWithMe(),
        getSharedByMe(),
        isAdmin ? getAllFileRequests() : getMyFileRequests()
      ])

      const myDocs = myDocsRes.status === 'fulfilled' && Array.isArray(myDocsRes.value.data) ? myDocsRes.value.data : (myDocsRes.value?.data?.content || [])
      const sharedMe = sharedMeRes.status === 'fulfilled' && Array.isArray(sharedMeRes.value.data) ? sharedMeRes.value.data : []
      const sharedBy = sharedByRes.status === 'fulfilled' && Array.isArray(sharedByRes.value.data) ? sharedByRes.value.data : []
      const reqs = reqsRes.status === 'fulfilled' && Array.isArray(reqsRes.value.data) ? reqsRes.value.data : []

      setItemsCache({
        documents: myDocs,
        sharedWithMe: sharedMe,
        sharedByMe: sharedBy,
        requests: reqs
      })

      const lastDocs = getLastSeen('documents')
      const lastSharedMe = getLastSeen('sharedWithMe')
      const lastSharedBy = getLastSeen('sharedByMe')
      const lastReqs = getLastSeen('requests')

      const countNew = (items, lastSeenTime) => {
        return items.filter(item => {
          const t = new Date(item.updatedAt || item.createdAt || item.requestedAt).getTime()
          return t > lastSeenTime
        }).length
      }

      setUnreadCounts({
        documents: countNew(myDocs, lastDocs),
        sharedWithMe: countNew(sharedMe, lastSharedMe),
        sharedByMe: countNew(sharedBy, lastSharedBy),
        requests: countNew(reqs, lastReqs)
      })
    } catch (err) {
      // Silent error in background poll
    }
  }, [userEmail, isAdmin, getLastSeen])

  // Periodic refresh every 15 seconds
  useEffect(() => {
    refreshCounts()
    const timer = setInterval(refreshCounts, 15000)
    return () => clearInterval(timer)
  }, [refreshCounts])

  const markSectionSeen = useCallback((section) => {
    if (!userEmail) return
    localStorage.setItem(`tv_seen_${userEmail}_${section}`, new Date().toISOString())
    setUnreadCounts(prev => ({ ...prev, [section]: 0 }))
  }, [userEmail])

  const isItemUpdated = useCallback((section, item) => {
    if (!item) return false
    const lastSeenTime = getLastSeen(section)
    const itemTime = new Date(item.updatedAt || item.createdAt || item.requestedAt).getTime()
    return itemTime > lastSeenTime
  }, [getLastSeen])

  return (
    <NotificationContext.Provider value={{ unreadCounts, markSectionSeen, isItemUpdated, refreshCounts }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
