import * as React from 'react'
import type { ToastProps } from '@/components/ui/toast'

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 4000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type State = { toasts: ToasterToast[] }

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

function dispatch(action: { type: 'ADD' | 'DISMISS' | 'REMOVE'; toast?: ToasterToast; toastId?: string }) {
  if (action.type === 'ADD') {
    memoryState = { toasts: [action.toast!, ...memoryState.toasts].slice(0, TOAST_LIMIT) }
  } else if (action.type === 'DISMISS') {
    memoryState = {
      toasts: memoryState.toasts.map((t) =>
        t.id === action.toastId || action.toastId === undefined ? { ...t, open: false } : t,
      ),
    }
    setTimeout(() => dispatch({ type: 'REMOVE', toastId: action.toastId }), TOAST_REMOVE_DELAY)
  } else if (action.type === 'REMOVE') {
    memoryState = {
      toasts: action.toastId === undefined ? [] : memoryState.toasts.filter((t) => t.id !== action.toastId),
    }
  }
  listeners.forEach((l) => l(memoryState))
}

function toast({ ...props }: Omit<ToasterToast, 'id'>) {
  const id = genId()
  dispatch({ type: 'ADD', toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dispatch({ type: 'DISMISS', toastId: id }) } } })
  return { id, dismiss: () => dispatch({ type: 'DISMISS', toastId: id }) }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => { const i = listeners.indexOf(setState); if (i > -1) listeners.splice(i, 1) }
  }, [])
  return { ...state, toast, dismiss: (id?: string) => dispatch({ type: 'DISMISS', toastId: id }) }
}

export { useToast, toast }
