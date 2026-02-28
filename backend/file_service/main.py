import sys
import os

# Add the backend directory to sys.path so shared modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from shared.config import get_settings
from shared.database import get_db, init_db, SessionLocal
from shared.models import UploadedFile
from shared.logger import get_logger

from file_service.parsers.pdf_parser import parse_pdf
from file_service.parsers.docx_parser import parse_docx
from file_service.parsers.excel_parser import parse_excel
from file_service.parsers.text_parser import parse_text
from file_service.parsers.code_parser import parse_code
from file_service.storage.file_store import save_file, delete_file as delete_stored_file

logger = get_logger(__name__)
settings = get_settings()

app = FastAPI(title="File Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── File extension to parser mapping ──────────────────────────────────────

# Extensions supported by each parser
PDF_EXTENSIONS = {".pdf"}
DOCX_EXTENSIONS = {".docx"}
EXCEL_EXTENSIONS = {".xlsx", ".xls", ".csv", ".tsv"}
TEXT_EXTENSIONS = {".txt", ".md", ".log"}
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml",
    ".xml", ".html", ".htm", ".css", ".scss", ".less",
    ".java", ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".rb", ".php",
    ".swift", ".kt", ".scala", ".r", ".sql", ".sh", ".bash", ".zsh",
    ".ps1", ".toml", ".ini", ".cfg", ".env", ".tf", ".vue", ".svelte",
}


def get_parser(filename: str):
    """Return the appropriate parser function based on file extension.

    Args:
        filename: The filename to determine the parser for.

    Returns:
        A callable parser function with signature (file_data: bytes, filename: str) -> str.

    Raises:
        ValueError: If no parser is available for the file type.
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext in PDF_EXTENSIONS:
        return parse_pdf
    elif ext in DOCX_EXTENSIONS:
        return parse_docx
    elif ext in EXCEL_EXTENSIONS:
        return parse_excel
    elif ext in TEXT_EXTENSIONS:
        return parse_text
    elif ext in CODE_EXTENSIONS:
        return parse_code
    else:
        # Default to text parser for unknown extensions
        return parse_text


# ── Pydantic request/response models ─────────────────────────────────────

class ParseRequest(BaseModel):
    file_ids: list[str]


class FileMetadataResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    created_at: str


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    file_type: str
    file_size: int


class ParsedFileContent(BaseModel):
    file_id: str
    filename: str
    content: str | None


# ── Startup event ─────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Initialize the database on startup."""
    init_db()
    logger.info("File Service started, database initialized")


# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "file_service"}


@app.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)):
    """Upload a file, save to storage, parse content, and save metadata to DB."""
    # Read file data
    file_data = await file.read()
    filename = file.filename or "unknown"
    file_size = len(file_data)

    # Check file size limit
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB} MB.",
        )

    # Determine file type
    ext = os.path.splitext(filename)[1].lower()
    file_type = ext.lstrip(".") if ext else "unknown"

    # Save to storage
    try:
        storage_path = save_file(file_data, filename)
    except Exception as e:
        logger.error(f"Failed to save file '{filename}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Parse content
    parsed_content = None
    try:
        parser = get_parser(filename)
        parsed_content = parser(file_data, filename)
    except Exception as e:
        logger.warning(f"Failed to parse file '{filename}': {str(e)}")
        # Continue even if parsing fails; store the file without parsed content

    # Save metadata to database
    db: Session = SessionLocal()
    try:
        uploaded_file = UploadedFile(
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            storage_path=storage_path,
            parsed_content=parsed_content,
        )
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

        logger.info(f"Uploaded file: id={uploaded_file.id}, name={filename}")

        return UploadResponse(
            file_id=uploaded_file.id,
            filename=uploaded_file.filename,
            file_type=uploaded_file.file_type,
            file_size=uploaded_file.file_size,
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save file metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file metadata: {str(e)}")
    finally:
        db.close()


@app.post("/parse")
async def parse(request: ParseRequest):
    """Return parsed content for the given file IDs."""
    db: Session = SessionLocal()
    try:
        results = []
        for file_id in request.file_ids:
            file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
            if file_record:
                results.append(
                    ParsedFileContent(
                        file_id=file_record.id,
                        filename=file_record.filename,
                        content=file_record.parsed_content,
                    )
                )
            else:
                results.append(
                    ParsedFileContent(
                        file_id=file_id,
                        filename="unknown",
                        content=None,
                    )
                )
        return {"files": [r.model_dump() for r in results]}
    finally:
        db.close()


@app.get("/files/{file_id}", response_model=FileMetadataResponse)
async def get_file_metadata(file_id: str):
    """Get file metadata by ID."""
    db: Session = SessionLocal()
    try:
        file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        return FileMetadataResponse(
            id=file_record.id,
            filename=file_record.filename,
            file_type=file_record.file_type,
            file_size=file_record.file_size,
            created_at=file_record.created_at.isoformat(),
        )
    finally:
        db.close()


@app.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file and its metadata."""
    db: Session = SessionLocal()
    try:
        file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        # Delete from storage
        try:
            delete_stored_file(file_record.storage_path)
        except Exception as e:
            logger.warning(f"Failed to delete stored file: {str(e)}")

        # Delete from database
        db.delete(file_record)
        db.commit()

        logger.info(f"Deleted file: id={file_id}, name={file_record.filename}")
        return {"message": "File deleted successfully", "file_id": file_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
