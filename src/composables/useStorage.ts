import { useRecords } from './useRecords'
import { useCustomActions } from './useCustomActions'
import { useDailyTodos } from './useDailyTodos'

export function useStorage() {
  const records = useRecords()
  const actions = useCustomActions()
  const todos = useDailyTodos()

  return {
    ...records,
    ...actions,
    ...todos,
  }
}
