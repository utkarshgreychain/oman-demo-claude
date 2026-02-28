from shared.logger import get_logger

logger = get_logger(__name__)

# Mapping of file extensions to language names
EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript (jsx)",
    ".tsx": "typescript (tsx)",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".java": "java",
    ".c": "c",
    ".cpp": "c++",
    ".h": "c header",
    ".hpp": "c++ header",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".r": "r",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "bash",
    ".zsh": "zsh",
    ".ps1": "powershell",
    ".toml": "toml",
    ".ini": "ini",
    ".cfg": "config",
    ".env": "env",
    ".dockerfile": "dockerfile",
    ".tf": "terraform",
    ".vue": "vue",
    ".svelte": "svelte",
}


def detect_language(filename: str) -> str:
    """Detect the programming language based on file extension.

    Args:
        filename: The filename to check.

    Returns:
        The detected language name, or "unknown" if not recognized.
    """
    lower = filename.lower()

    # Handle special filenames
    if lower == "dockerfile":
        return "dockerfile"
    if lower == "makefile":
        return "makefile"

    # Check extension-based detection
    for ext, language in EXTENSION_LANGUAGE_MAP.items():
        if lower.endswith(ext):
            return language

    return "unknown"


def parse_code(file_data: bytes, filename: str) -> str:
    """Parse code files by reading them as text with language detection.

    Args:
        file_data: Raw file bytes.
        filename: Original filename (used for language detection).

    Returns:
        The code content with a language header.
    """
    try:
        language = detect_language(filename)
        content = file_data.decode("utf-8")
        return f"[Language: {language}]\n\n{content}"
    except UnicodeDecodeError:
        try:
            content = file_data.decode("latin-1")
            language = detect_language(filename)
            return f"[Language: {language}]\n\n{content}"
        except Exception as e:
            logger.error(f"Failed to parse code file '{filename}': {str(e)}")
            raise
