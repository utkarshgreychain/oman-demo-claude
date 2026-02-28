from shared.logger import get_logger

logger = get_logger(__name__)


def parse_text(file_data: bytes, filename: str) -> str:
    """Parse plain text files (.txt, .md, .log).

    Args:
        file_data: Raw file bytes.
        filename: Original filename.

    Returns:
        The file content as a string.
    """
    try:
        return file_data.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_data.decode("latin-1")
        except Exception as e:
            logger.error(f"Failed to decode text file '{filename}': {str(e)}")
            raise
