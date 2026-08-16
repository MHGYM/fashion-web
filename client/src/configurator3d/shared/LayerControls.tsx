import type { Transform } from './types'
import './LayerControls.css'

interface LayerControlsProps {
  transform: Transform
  onChange: (t: Transform) => void
  onRemove: () => void
}

export default function LayerControls({ transform, onChange, onRemove }: LayerControlsProps) {
  const set = (patch: Partial<Transform>) => onChange({ ...transform, ...patch })

  return (
    <div className="layer-controls">
      <label className="layer-controls__row">
        <span>Links / rechts</span>
        <input type="range" min={-0.45} max={0.45} step={0.01} value={transform.x}
          onChange={(e) => set({ x: parseFloat(e.target.value) })} />
      </label>
      <label className="layer-controls__row">
        <span>Boven / onder</span>
        <input type="range" min={-0.45} max={0.45} step={0.01} value={transform.y}
          onChange={(e) => set({ y: parseFloat(e.target.value) })} />
      </label>
      <label className="layer-controls__row">
        <span>Grootte</span>
        <input type="range" min={0.2} max={2.5} step={0.02} value={transform.scale}
          onChange={(e) => set({ scale: parseFloat(e.target.value) })} />
      </label>
      <label className="layer-controls__row">
        <span>Rotatie</span>
        <input type="range" min={-180} max={180} step={1} value={transform.rotation}
          onChange={(e) => set({ rotation: parseFloat(e.target.value) })} />
      </label>
      <button type="button" className="layer-controls__remove" onClick={onRemove}>
        Verwijderen
      </button>
    </div>
  )
}
