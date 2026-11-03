import { doc } from 'firebase/firestore'
import { db } from '../firebase'

export const DEFAULT_WORKSPACE_ID = 'life'
// Firestore docs under meta/ that belong to a single workspace
export const WORKSPACE_DOC_NAMES = [
  'quests', 'character', 'stages', 'levelingRules', 'monsters', 'inbox', 'rewardSettings', 'rewardShop',
  'stories', 'npcs', 'maps', 'skills', 'canvasNotes',
]
const ACTIVE_WORKSPACE_KEY = 'brave-todo:active-workspace'

function readActiveWorkspaceId() {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || DEFAULT_WORKSPACE_ID
  } catch {
    return DEFAULT_WORKSPACE_ID
  }
}

// Read once per page load. Hooks keep module-level caches, so switching workspaces reloads the page.
export const ACTIVE_WORKSPACE_ID = readActiveWorkspaceId()

// LIFE keeps the original doc / key names so existing data stays where it is
const scoped = (name) => (ACTIVE_WORKSPACE_ID === DEFAULT_WORKSPACE_ID ? name : `${name}@${ACTIVE_WORKSPACE_ID}`)

export const wsDocName = scoped
export const wsKey = scoped

export function wsDoc(name) {
  return doc(db, 'meta', scoped(name))
}

export function workspaceKey(workspaceId, key) {
  return workspaceId === DEFAULT_WORKSPACE_ID ? key : `${key}@${workspaceId}`
}

export function switchWorkspace(workspaceId) {
  if (workspaceId === ACTIVE_WORKSPACE_ID) return
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
  window.location.reload()
}
