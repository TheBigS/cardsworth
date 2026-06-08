import { marked } from 'marked'

// Configure marked for card content
marked.setOptions({
  breaks: true,  // Single newline → <br>
  gfm: true,     // GitHub Flavored Markdown
})

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string
}
