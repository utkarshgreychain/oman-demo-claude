// Markdown rendering utilities

export function extractCodeBlocks(text: string): { language: string; code: string }[] {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { language: string; code: string }[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ language: match[1] || 'text', code: match[2].trim() });
  }
  return blocks;
}

export function stripVisualizationBlocks(text: string): string {
  return text.replace(/```visualization\n[\s\S]*?```/g, '').trim();
}

/**
 * Replace inline web citations like [1], [2] with HTML <cite> tags.
 * Avoids matching markdown link syntax [text](url) or image syntax ![alt](url).
 */
export function injectWebCitations(text: string): string {
  return text.replace(
    /(?<!\!)\[(\d{1,2})\](?!\()/g,
    '<cite data-index="$1">$1</cite>',
  );
}

/**
 * Replace inline file citations like [Source: filename.xlsx] with HTML <cite> tags.
 */
export function injectFileCitations(text: string): string {
  return text.replace(
    /\[Source:\s*([^\]]+)\]/g,
    '<cite data-file="$1">$1</cite>',
  );
}

/**
 * Apply all transformations: strip viz blocks, inject citations.
 */
export function processMarkdown(text: string): string {
  let processed = stripVisualizationBlocks(text);
  processed = injectWebCitations(processed);
  processed = injectFileCitations(processed);
  return processed;
}
