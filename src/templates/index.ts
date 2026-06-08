import yaml from 'js-yaml'
import type { CardTemplate } from './types'

// Import YAML files as raw strings (Vite feature)
import itemCardYaml from './item-card.yaml?raw'
import classFeatureYaml from './class-feature.yaml?raw'
import speciesFeatureYaml from './species-feature.yaml?raw'
import creatureCardYaml from './creature-card.yaml?raw'
import questCardYaml from './quest-card.yaml?raw'
import rumorCardYaml from './rumor-card.yaml?raw'

export type { CardTemplate }

function parseTemplate(yamlContent: string): CardTemplate {
  const parsed = yaml.load(yamlContent) as CardTemplate
  return parsed
}

export const templates: CardTemplate[] = [
  parseTemplate(itemCardYaml),
  parseTemplate(classFeatureYaml),
  parseTemplate(speciesFeatureYaml),
  parseTemplate(creatureCardYaml),
  parseTemplate(questCardYaml),
  parseTemplate(rumorCardYaml),
]

export function getTemplateById(id: string): CardTemplate | undefined {
  return templates.find(t => t.id === id)
}
