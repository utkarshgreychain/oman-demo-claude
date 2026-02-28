import io
from docx import Document

from shared.logger import get_logger

logger = get_logger(__name__)


def parse_docx(file_data: bytes, filename: str) -> str:
    """Parse .docx files and extract all paragraph text.

    Args:
        file_data: Raw file bytes.
        filename: Original filename.

    Returns:
        All paragraph text from the document, joined by newlines.
    """
    try:
        doc = Document(io.BytesIO(file_data))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        return "\n\n".join(paragraphs)

    except Exception as e:
        logger.error(f"Failed to parse DOCX file '{filename}': {str(e)}")
        raise
