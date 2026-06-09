import {Section} from './Section'
import {GeneralPanel} from './panels/GeneralPanel'
import {TestingPanel} from './panels/TestingPanel'

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <Section title="General">
          <GeneralPanel />
        </Section>
          <Section title="Commands">
              <p className="text-xs text-fg-ghost font-mono">coming soon</p>
        </Section>
        <Section title="Jules Connection">
          <TestingPanel />
        </Section>
      </div>
    </div>
  )
}
