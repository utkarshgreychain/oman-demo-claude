import io
import pandas as pd

from shared.logger import get_logger

logger = get_logger(__name__)


def parse_excel(file_data: bytes, filename: str) -> str:
    """Parse Excel (.xlsx, .xls) and CSV/TSV files into text representation.

    Args:
        file_data: Raw file bytes.
        filename: Original filename (used to determine format).

    Returns:
        String representation of the spreadsheet content.
    """
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    try:
        if extension in ("csv",):
            df = pd.read_csv(io.BytesIO(file_data))
            return df.to_string(index=False)

        elif extension in ("tsv",):
            df = pd.read_csv(io.BytesIO(file_data), sep="\t")
            return df.to_string(index=False)

        elif extension in ("xlsx", "xls"):
            # Read all sheets from the Excel file
            excel_file = pd.ExcelFile(io.BytesIO(file_data))
            sheets_text = []

            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                sheet_content = df.to_string(index=False)
                sheets_text.append(f"--- Sheet: {sheet_name} ---\n{sheet_content}")

            return "\n\n".join(sheets_text)

        else:
            raise ValueError(f"Unsupported Excel/CSV extension: .{extension}")

    except Exception as e:
        logger.error(f"Failed to parse Excel/CSV file '{filename}': {str(e)}")
        raise
