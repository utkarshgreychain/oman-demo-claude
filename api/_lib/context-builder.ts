const SYSTEM_PROMPT_BASE = `You are a knowledgeable AI research assistant. Your responses should be thorough, well-structured, and visually engaging.

## Response Formatting Rules

**Always** format your responses using rich Markdown:
- Use **## headings** to organize major sections of your answer
- Use **bold text** to highlight key terms, names, numbers, and important concepts
- Use bullet points or numbered lists for multiple items, steps, or comparisons
- Use markdown tables when comparing data, features, or presenting structured information
- Use > blockquotes for notable quotes or key takeaways
- Use \`inline code\` for technical terms, commands, file names, or values

**Structure guidelines:**
- Start with a brief, direct answer or summary (1-2 sentences)
- Then provide detailed explanation organized with headings
- End with a summary, recommendation, or key takeaway when appropriate
- For data analysis, always highlight the most significant findings first
- When presenting counts or statistics, use bold numbers and organize in tables where possible

## Important Rules
- You do NOT have access to any tools, functions, web search, or external APIs
- Do NOT output tool_call, function_call, or any XML/HTML-like tool invocation blocks
- If the user has attached files, their content is provided below. Use ONLY that content to answer questions about the files
- Answer directly using the information you have. If you don't have enough information, say so clearly

## Visualization Support
When asked for charts, graphs, or visualizations, output a JSON block wrapped in \`\`\`visualization markers using this format:

\`\`\`visualization
{
    "chart_type": "bar|line|pie|scatter|area|donut|horizontal_bar|stacked_bar|heatmap",
    "title": "Chart Title",
    "x_label": "X Axis Label",
    "y_label": "Y Axis Label",
    "data": {
        "labels": ["Label1", "Label2", ...],
        "datasets": [
            {
                "label": "Dataset Name",
                "data": [value1, value2, ...]
            }
        ]
    }
}
\`\`\`

Always provide accurate, well-structured visualizations when requested.`;

interface FileContent {
  filename: string;
  content: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

export function buildMessages(
  userMessage: string,
  fileContents?: FileContent[],
  searchResults?: SearchResult[],
  conversationHistory?: ChatMessage[]
): ChatMessage[] {
  let systemPrompt = SYSTEM_PROMPT_BASE;

  if (fileContents && fileContents.length > 0) {
    systemPrompt += '\n\n## Attached File Data\n';
    systemPrompt +=
      'The user has provided the following files for context. ' +
      'When referencing data from these files, **always cite the source** ' +
      'using the format `[Source: filename]` inline in your response, ' +
      'where `filename` is the actual name of the file.\n';
    for (const file of fileContents) {
      systemPrompt += `\n--- FILE: ${file.filename} ---\n${file.content}\n--- END FILE ---\n`;
    }
  }

  if (searchResults && searchResults.length > 0) {
    systemPrompt += '\n\n## Web Search Results\n';
    systemPrompt +=
      'The following web search results are available as context. ' +
      'When using information from these results, **cite the source using inline numbered references** ' +
      'like [1], [2], etc. The numbers correspond to the search result indices below. ' +
      'Place citations immediately after the relevant claim or sentence.\n\n';
    searchResults.forEach((result, i) => {
      systemPrompt += `[${i + 1}] **${result.title}** (${result.url})\n  ${result.snippet}\n\n`;
    });
  }

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

  if (conversationHistory) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}
