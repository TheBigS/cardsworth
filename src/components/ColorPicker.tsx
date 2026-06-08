import { useState, useEffect } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
}

const COLOR_PRESETS = [
  { name: 'Burgundy', value: '#540000' },
  { name: 'Purple', value: '#5a2d6e' },
  { name: 'Gold', value: '#8B6914' },
  { name: 'Silver', value: '#3f4a52' },
  { name: 'Blue', value: '#1A2F4A' },
  { name: 'Green', value: '#2d6e2d' },
  { name: 'Black', value: '#1A1A1A' },
]

const STORAGE_KEY = 'cardsworth-custom-colors'
const MAX_CUSTOM_COLORS = 10

function loadCustomColors(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCustomColors(colors: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [customColors, setCustomColors] = useState<string[]>(loadCustomColors)

  useEffect(() => {
    saveCustomColors(customColors)
  }, [customColors])

  const addCustomColor = () => {
    // Don't add if it's already a preset or already in custom colors
    const isPreset = COLOR_PRESETS.some(p => p.value.toLowerCase() === value.toLowerCase())
    const isCustom = customColors.some(c => c.toLowerCase() === value.toLowerCase())

    if (isPreset || isCustom) return

    const newColors = [value, ...customColors].slice(0, MAX_CUSTOM_COLORS)
    setCustomColors(newColors)
  }

  const removeCustomColor = (colorToRemove: string) => {
    setCustomColors(customColors.filter(c => c !== colorToRemove))
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="color-presets">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className={`color-preset ${value.toLowerCase() === preset.value.toLowerCase() ? 'active' : ''}`}
            style={{ backgroundColor: preset.value }}
            onClick={() => onChange(preset.value)}
            title={preset.name}
          />
        ))}
      </div>
      <div className="custom-panel">
        <div className="custom-colors-label">Custom</div>
        <div className="color-picker-row">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="color-input"
          />
          <span className="color-value">{value}</span>
          <button
            type="button"
            className="save-color-btn"
            onClick={addCustomColor}
            title="Save to swatches"
          >
            +
          </button>
        </div>
        {customColors.length > 0 && (
          <div className="color-presets">
            {customColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-preset ${value.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange(color)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  removeCustomColor(color)
                }}
                title={`${color} (right-click to remove)`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
