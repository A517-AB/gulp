import { useTheme } from '@renderer/providers/theme'

const SWATCHES = [
    { label: 'Red', hue: 25 },
    { label: 'Orange', hue: 45 },
    { label: 'Yellow', hue: 85 },
    { label: 'Green', hue: 145 },
    { label: 'Cyan', hue: 185 },
    { label: 'Blue', hue: 247 },
    { label: 'Purple', hue: 280 },
    { label: 'Pink', hue: 330 },
]

export function ColorPalettePanel() {
    const { accentHue, setAccentHue } = useTheme()

    return (
        <div className="space-y-4 font-mono select-none">
            <div className="text-3xs text-fg-ghost pb-2 border-b border-hair leading-relaxed">
                Customize the accent color hue used across the UI.
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-3xs text-fg-dim uppercase tracking-wider">
                    <span>Hue</span>
                    <span className="text-fg-primary">{accentHue}°</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={accentHue}
                    onChange={e => { setAccentHue(Number(e.target.value)); }}
                    className="w-full accent-primary h-1 bg-surface-mid rounded-full appearance-none cursor-pointer outline-none"
                    style={{
                        background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                    }}
                />
            </div>

            <div className="pt-2">
                <div className="text-3xs text-fg-dim uppercase tracking-wider mb-2">Presets</div>
                <div className="flex flex-wrap gap-2">
                    {SWATCHES.map(swatch => (
                        <button
                            key={swatch.hue}
                            onClick={() => { setAccentHue(swatch.hue); }}
                            className="w-6 h-6 rounded-full border border-hair transition-transform hover:scale-110 focus:outline-none"
                            style={{ backgroundColor: `oklch(0.6 0.2 ${swatch.hue})` }}
                            title={swatch.label}
                            aria-label={`Set hue to ${swatch.label}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
