export interface Todo {
  id: string
  text: string
  done: boolean
  sessionId?: string
}

const KEY = 'jules:todos'

export function getTodos(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Todo[]
  } catch {
    return []
  }
}

export function saveTodos(todos: Todo[]): void {
  localStorage.setItem(KEY, JSON.stringify(todos))
}

export function createTodo(text: string, sessionId?: string): Todo {
  const todo: Todo = { id: crypto.randomUUID(), text, done: false }
  if (sessionId !== undefined) todo.sessionId = sessionId
  return todo
}
