import { useCallback } from 'react'
import useWorkspaces from './useWorkspaces'
import { WORK_FEATURE_OPTIONS } from '../utils/workFeatures'

export { WORK_FEATURE_OPTIONS }

// Feature visibility of the active workspace (stored on the workspace record)
export default function useWorkFeatureVisibility() {
  const { activeWorkspace, loaded, setWorkspaceFeature, setAllWorkspaceFeatures } = useWorkspaces()
  const visibility = activeWorkspace.features

  return {
    visibility,
    loaded,
    isVisible: useCallback((key) => key === 'Tasks' || visibility[key] !== false, [visibility]),
    setFeatureVisible: useCallback((key, visible) => setWorkspaceFeature(activeWorkspace.id, key, visible), [activeWorkspace.id, setWorkspaceFeature]),
    resetVisibility: useCallback(() => setAllWorkspaceFeatures(activeWorkspace.id, true), [activeWorkspace.id, setAllWorkspaceFeatures]),
  }
}
