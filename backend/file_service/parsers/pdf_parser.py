import io
from PyPDF2 import PdfReader

from shared.logger import get_logger

logger = get_logger(__name__)


def parse_pdf(file_data: bytes, filename: str) -> str:
    """Parse PDF files and extract text from all pages.

    Args:
        file_data: Raw file bytes.
        filename: Original filename.

    Returns:
        Concatenated text from all pages of the PDF.
    """
    try:
        reader = PdfReader(io.BytesIO(file_data))
        pages_text = []

        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages_text.append(text)

        return "\n\n".join(pages_text)

    except Exception as e:
        logger.error(f"Failed to parse PDF file '{filename}': {str(e)}")
        raise
