import { templates, type CardTemplate } from '../templates'

interface TemplateSelectorProps {
  onSelect: (template: CardTemplate) => void
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find(t => t.id === e.target.value)
    if (template) {
      onSelect(template)
    }
  }

  return (
    <div className="form-group">
      <label>Quick Template</label>
      <select onChange={handleChange} defaultValue="" className="template-select">
        <option value="" disabled>Choose a template...</option>
        {templates.map(template => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  )
}
