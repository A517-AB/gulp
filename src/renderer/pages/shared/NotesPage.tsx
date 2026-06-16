import { NoteEditor } from '@/components/markdown/NoteEditor'

export default function NotesPage() {
  return (
    <NoteEditor
      id="default"
      title="Notes"
      className="w-full h-full px-4 py-4"
    />
  )
}
