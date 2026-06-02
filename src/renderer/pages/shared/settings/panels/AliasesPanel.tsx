import { useState } from 'react'
import { useCommands } from '@/hooks/use-commands'
import { SessionPicker } from './SessionPicker'
import { TRIGGERS, TRIGGER_META } from '@shared/commands'
import type { Command, CommandType, Trigger } from '@shared/commands'
import { isElectron } from '@shared/bridge'

type CommandForm = Omit<Command, 'id'>

interface FormState {
  trigger: Trigger
  command: string
  type: CommandType
  sessionId: string
  label: string
  instructions: string
  expects: 'md' | 'zip' | ''
}

const EMPTY_STATE: FormState = { trigger: '%', command: '', type: 'jules', sessionId: '', label: '', instructions: '', expects: '' }

function toForm(s: FormState): CommandForm {
  const base: CommandForm = {
    trigger: s.trigger,
    command: s.command,
    type: s.type,
    ...(s.label        && { label: s.label }),
    ...(s.instructions && { instructions: s.instructions }),
  }
  if (s.type === 'jules') {
    base.sessionId = s.sessionId
    if (s.expects) base.expects = s.expects
  }
  return base
}

function fromAlias(a: Command): FormState {
  return {
    trigger:      a.trigger,
    command:      a.command,
    type:         a.type,
    sessionId:    a.sessionId    ?? '',
    label:        a.label        ?? '',
    instructions: a.instructions ?? '',
    expects:      a.expects      ?? '',
  }
}

function AliasRow({ alias, onEdit, onDelete }: {
  alias: Command
  onEdit: (a: Command) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="font-mono text-xs text-fg-primary w-32 truncate">{alias.trigger}{alias.command}</span>
      <span className="text-xs text-fg-muted flex-1 truncate">{alias.label ?? alias.sessionId}</span>
      {alias.expects && (
        <span className="text-[10px] font-mono text-fg-ghost border border-hair rounded px-1">{alias.expects}</span>
      )}
      <button onClick={() => { onEdit(alias) }} className="text-[10px] font-mono text-fg-dim hover:text-fg-primary transition-colors">edit</button>
      <button onClick={() => { onDelete(alias.id) }} className="text-[10px] font-mono text-fg-dim hover:text-red-400 transition-colors">del</button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, list }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; list?: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-mono text-fg-ghost">{label}</span>
      <input
        value={value}
        onChange={e => { onChange(e.target.value) }}
        placeholder={placeholder}
        list={list}
        className="w-full bg-surface border border-hair rounded px-2 py-1 text-xs font-mono text-fg-primary placeholder:text-fg-ghost focus:outline-none focus:border-subtle"
      />
    </div>
  )
}

function CommandFormRow({ initial, onSave, onCancel }: {
  initial: FormState
  onSave: (form: CommandForm) => void
  onCancel: () => void
}) {
  const [s, setS] = useState<FormState>(initial)
  const set = (k: keyof FormState) => (v: string) => { setS(f => ({ ...f, [k]: v })) }
  const isJules = TRIGGER_META[s.trigger].kind === 'jules'
  const valid = s.command.trim() !== '' && (!isJules || s.sessionId.trim() !== '')

  return (
    <div className="py-3 space-y-3 border-t border-hair">
      {/* Trigger */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-fg-ghost">trigger</span>
        <div className="flex gap-1.5 flex-wrap">
          {TRIGGERS.map(t => (
            <button
              key={t}
              onClick={() => {
                const kind = TRIGGER_META[t].kind
                setS(f => ({ ...f, trigger: t, type: kind === 'local' ? 'local' : 'jules' }))
              }}
              className={`px-2 py-0.5 rounded font-mono text-xs transition-colors ${
                s.trigger === t
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-surface border border-hair text-fg-ghost hover:text-fg-dim'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-fg-ghost">
          <span className="text-fg-dim">{TRIGGER_META[s.trigger].label}</span>
          {' — '}{TRIGGER_META[s.trigger].description}
        </p>
      </div>

      {/* Command + Session (session only for Jules) */}
      <div className={isJules ? 'grid grid-cols-2 gap-2' : ''}>
        <Field label="command" value={s.command} onChange={set('command')} placeholder="e.g. notes" />
        {isJules && (
          <SessionPicker value={s.sessionId} onChange={v => { setS(f => ({ ...f, sessionId: v })) }} />
        )}
      </div>

      {/* Label + Instructions */}
      <Field label="label" value={s.label} onChange={set('label')} placeholder="display name (optional)" />
      {isJules && (
        <Field label="instructions" value={s.instructions} onChange={set('instructions')} placeholder="hidden context appended on send" />
      )}

      {/* Expects — Jules only */}
      {isJules && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-fg-ghost">expects</span>
          {(['', 'md', 'zip'] as const).map(v => (
            <label key={v} className="flex items-center gap-1 text-[10px] font-mono text-fg-dim cursor-pointer">
              <input
                type="radio"
                name="expects"
                value={v}
                checked={s.expects === v}
                onChange={() => { setS(f => ({ ...f, expects: v })) }}
                className="accent-violet-500"
              />
              {v || 'none'}
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { if (valid) onSave(toForm(s)) }}
          disabled={!valid}
          className="px-3 py-1 rounded bg-surface border border-subtle text-xs font-mono text-fg-primary hover:bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >save</button>
        <button onClick={onCancel} className="px-3 py-1 rounded text-xs font-mono text-fg-dim hover:text-fg-primary transition-colors">cancel</button>
      </div>
    </div>
  )
}

export function AliasesPanel() {
  const { userCommands: aliases, status, add, update, remove } = useCommands()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Command | null>(null)

  return (
    <div className="space-y-1">
      {status === 'file-not-found' && (
        <p className="text-[10px] font-mono text-amber-400 pb-2">
          aliases.json not found — will be created on first save{!isElectron ? ' (web: using localStorage)' : ''}
        </p>
      )}
      {aliases.length === 0 && status !== 'loading' && (
        <p className="text-xs text-fg-ghost py-1">no aliases yet</p>
      )}
      <div className="divide-y divide-hair">
        {aliases.map((a: Command) =>
          editing?.id === a.id ? (
            <CommandFormRow
              key={a.id}
              initial={fromAlias(a)}
              onSave={form => { update({ ...form, id: a.id }); setEditing(null) }}
              onCancel={() => { setEditing(null) }}
            />
          ) : (
            <AliasRow key={a.id} alias={a} onEdit={setEditing} onDelete={remove} />
          )
        )}
      </div>
      {adding ? (
        <CommandFormRow
          initial={EMPTY_STATE}
          onSave={form => { add(form); setAdding(false) }}
          onCancel={() => { setAdding(false) }}
        />
      ) : (
        <button
          onClick={() => { setAdding(true); setEditing(null) }}
          className="mt-2 text-[10px] font-mono text-fg-dim hover:text-fg-primary transition-colors"
        >+ add alias</button>
      )}
    </div>
  )
}
