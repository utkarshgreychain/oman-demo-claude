from shared.logger import get_logger

logger = get_logger(__name__)


def chunk_text(
    text: str, chunk_size: int = 4000, overlap: int = 200
) -> list[str]:
    """Split text into chunks of configurable size with overlap.

    Args:
        text: The input text to split.
        chunk_size: Maximum size of each chunk in characters (default 4000).
        overlap: Number of overlapping characters between consecutive chunks
                 (default 200).

    Returns:
        A list of text chunks.
    """
    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        # If this is not the last chunk, try to break at a natural boundary
        if end < len(text):
            # Look for a paragraph break near the end
            newline_pos = text.rfind("\n\n", start + chunk_size // 2, end)
            if newline_pos != -1:
                end = newline_pos + 2  # Include the newlines
            else:
                # Look for a single newline
                newline_pos = text.rfind("\n", start + chunk_size // 2, end)
                if newline_pos != -1:
                    end = newline_pos + 1
                else:
                    # Look for a space
                    space_pos = text.rfind(" ", start + chunk_size // 2, end)
                    if space_pos != -1:
                        end = space_pos + 1

        chunk = text[start:end]
        chunks.append(chunk)

        # Move start forward, accounting for overlap
        start = end - overlap if end < len(text) else end

    logger.info(f"Chunked text into {len(chunks)} chunks (size={chunk_size}, overlap={overlap})")
    return chunks
