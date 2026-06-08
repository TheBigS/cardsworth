interface FontSizeControlProps {
  value: number
  onChange: (size: number) => void
  label: string
  min: number
  max: number
}

export function FontSizeControl({ value, onChange, label, min, max }: FontSizeControlProps) {
  return (
    <div className="form-group">
      <label>
        {label}: <span className="font-size-value">{value}px</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-size-slider"
      />
    </div>
  )
}
