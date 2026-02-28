from typing import Optional

SYSTEM_PROMPT_BASE = """You are a knowledgeable AI research assistant. Your responses should be thorough, well-structured, and visually engaging.

## Response Formatting Rules

**Always** format your responses using rich Markdown:
- Use **## headings** to organize major sections of your answer
- Use **bold text** to highlight key terms, names, numbers, and important concepts
- Use bullet points or numbered lists for multiple items, steps, or comparisons
- Use markdown tables when comparing data, features, or presenting structured information
- Use > blockquotes for notable quotes or key takeaways
- Use `inline code` for technical terms, commands, file names, or values

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
When asked for charts, graphs, or visualizations, output a JSON block wrapped in ```visualization markers using this format:

```visualization
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
```

Always provide accurate, well-structured visualizations when requested."""


def build_messages(
    user_message: str,
    file_contents: Optional[list[dict]] = None,
    search_results: Optional[list[dict]] = None,
    conversation_history: Optional[list[dict]] = None,
) -> list[dict]:
    """Build the messages list for the LLM.

    Args:
        user_message: The current user message.
        file_contents: Optional list of dicts with "filename" and "content" keys.
        search_results: Optional list of dicts with "title", "url", and "snippet" keys.
        conversation_history: Optional list of message dicts with "role" and "content".

    Returns:
        A list of message dicts ready to send to the LLM.
    """
    system_prompt = SYSTEM_PROMPT_BASE

    # Append file contents to system prompt if provided
    if file_contents:
        system_prompt += "\n\n## Attached File Data\n"
        system_prompt += (
            "The user has provided the following files for context. "
            "When referencing data from these files, **always cite the source** "
            "using the format `[Source: filename]` inline in your response, "
            "where `filename` is the actual name of the file.\n"
        )
        for file_info in file_contents:
            filename = file_info.get("filename", "unknown")
            content = file_info.get("content", "")
            system_prompt += f"\n--- FILE: {filename} ---\n{content}\n--- END FILE ---\n"

    # Append search results to system prompt if provided
    if search_results:
        system_prompt += "\n\n## Web Search Results\n"
        system_prompt += (
            "The following web search results are available as context. "
            "When using information from these results, **cite the source using inline numbered references** "
            "like [1], [2], etc. The numbers correspond to the search result indices below. "
            "Place citations immediately after the relevant claim or sentence.\n\n"
        )
        for i, result in enumerate(search_results, 1):
            title = result.get("title", "")
            url = result.get("url", "")
            snippet = result.get("snippet", "")
            system_prompt += f"[{i}] **{title}** ({url})\n  {snippet}\n\n"

    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    if conversation_history:
        for msg in conversation_history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    # Add the current user message
    messages.append({"role": "user", "content": user_message})

    return messages
