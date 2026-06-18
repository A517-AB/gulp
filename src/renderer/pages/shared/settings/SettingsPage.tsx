import {Section} from './Section'
import {TestingPanel} from './panels/TestingPanel'
import {NotificationPanel} from './panels/NotificationPanel'
import {TypographyPanel} from './panels/TypographyPanel'
import {ColorPalettePanel} from './panels/ColorPalettePanel'

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <Section title="Typography" defaultOpen={true}>
          <TypographyPanel />
        </Section>
        <Section title="Color Palette">
          <ColorPalettePanel />
        </Section>
        <Section title="Jules Connection">
          <TestingPanel />
        </Section>
        <Section title="Notifications">
          <NotificationPanel />
        </Section>
      </div>
    </div>
  )
}
