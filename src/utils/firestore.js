// Firestore 的薄包裝：讀取（getDoc / getDocs）會計入全站 loading，其餘 API 原樣轉出
import { getDoc as rawGetDoc, getDocs as rawGetDocs } from 'firebase/firestore'
import { trackLoading } from './loadingTracker'

export * from 'firebase/firestore'

export const getDoc = (...args) => trackLoading(rawGetDoc(...args))
export const getDocs = (...args) => trackLoading(rawGetDocs(...args))
