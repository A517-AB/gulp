import {Section} from './Section'
import {TestingPanel} from './panels/TestingPanel'

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <Section title="Jules Connection">
          <TestingPanel />
        </Section>
      </div>
    </div>
  )
}
