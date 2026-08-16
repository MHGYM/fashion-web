import { useState, useEffect } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  presets: { name: string; hex: string }[]
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export default function ColorPicker({ value, onChange, presets }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value)

  useEffect(() => setHexInput(value), [value])

  const commitHex = (raw: string) => {
    const v = raw.trim()
    if (HEX_RE.test(v)) onChange(v.startsWith('#') ? v : `#${v}`)
  }

  return (
    <div className="color-picker">
      <div className="color-picker__swatches">
        {presets.map((p) => (
          <button
            key={p.hex}
            type="button"
            className={`color-picker__swatch${value.toLowerCase() === p.hex.toLowerCase() ? ' is-active' : ''}`}
            style={{ background: p.hex }}
            title={p.name}
            aria-label={p.name}
            onClick={() => onChange(p.hex)}
          />
        ))}
      </div>
      <div className="color-picker__hex">
        <span className="color-picker__hex-preview" style={{ background: value }} />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={(e) => commitHex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex((e.target as HTMLInputElement).value)
          }}
          placeholder="#RRGGBB"
          maxLength={7}
        />
      </div>
    </div>
  )
}
