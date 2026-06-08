import { useState, useCallback } from 'react'
import { getTodos, saveTodos, createTodo, type Todo } from '@/lib/todos'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => getTodos())

  const add = useCallback((text: string, sessionId?: string) => {
    const next = [...getTodos(), createTodo(text, sessionId)]
    saveTodos(next)
    setTodos(next)
    console.log('[todos] added', text)
  }, [])

  const toggle = useCallback((id: string) => {
    const next = getTodos().map(t => t.id === id ? { ...t, done: !t.done } : t)
    saveTodos(next)
    setTodos(next)
  }, [])

  const remove = useCallback((id: string) => {
    const next = getTodos().filter(t => t.id !== id)
    saveTodos(next)
    setTodos(next)
    console.log('[todos] removed', id)
  }, [])

  const linkSession = useCallback((id: string, sessionId: string) => {
    const next = getTodos().map(t => t.id === id ? { ...t, sessionId } : t)
    saveTodos(next)
    setTodos(next)
  }, [])

  return { todos, add, toggle, remove, linkSession }
}

export type { Todo }
