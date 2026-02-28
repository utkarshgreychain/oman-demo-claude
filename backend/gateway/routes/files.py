"""File upload routes -- handles file operations directly via the shared database.

For local development, the gateway handles file operations directly instead of
proxying to file_service.
"""

import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from shared.config import get_settings
from shared.database import SessionLocal
from shared.models import UploadedFile
from shared.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/files", tags=["Files"])


def _get_parser(filename: str):
    """Return the appropriate parser function based on file extension."""
    ext = os.path.splitext(filename)[1].lower()

    excel_exts = {'.xlsx', '.xls', '.csv', '.tsv'}
    text_exts = {'.txt', '.md', '.log'}
    code_exts = {'.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml',
                 '.xml', '.html', '.css', '.go', '.rs', '.java', '.c', '.cpp',
                 '.h', '.sh', '.sql', '.toml', '.ini', '.cfg', '.env'}

    if ext in excel_exts:
        from file_service.parsers.excel_parser import parse_excel
        return parse_excel
    elif ext == '.pdf':
        from file_service.parsers.pdf_parser import parse_pdf
        return parse_pdf
    elif ext == '.docx':
        from file_service.parsers.docx_parser import parse_docx
        return parse_docx
    elif ext in text_exts:
        from file_service.parsers.text_parser import parse_text
        return parse_text
    elif ext in code_exts:
        from file_service.parsers.code_parser import parse_code
        return parse_code
    else:
        from file_service.parsers.text_parser import parse_text
        return parse_text


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file, parse its content, and store metadata."""
    file_data = await file.read()
    filename = file.filename or "unknown"

    # Check file size
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_data) > max_size:
        raise HTTPException(status_code=413, detail=f"File too large. Max: {settings.MAX_FILE_SIZE_MB}MB")

    # Save file to disk
    from file_service.storage.file_store import save_file
    storage_path = save_file(file_data, filename)

    # Parse file content
    parser = _get_parser(filename)
    try:
        parsed_content = parser(file_data, filename)
    except Exception as e:
        logger.error(f"Failed to parse file {filename}: {e}")
        parsed_content = f"[Failed to parse file: {str(e)}]"

    # Save to database
    ext = os.path.splitext(filename)[1].lower()
    db: Session = SessionLocal()
    try:
        uploaded = UploadedFile(
            filename=filename,
            file_type=ext,
            file_size=len(file_data),
            storage_path=storage_path,
            parsed_content=parsed_content,
        )
        db.add(uploaded)
        db.commit()
        db.refresh(uploaded)

        return {
            "id": uploaded.id,
            "filename": uploaded.filename,
            "file_type": uploaded.file_type,
            "file_size": uploaded.file_size,
            "created_at": uploaded.created_at.isoformat() if uploaded.created_at else None,
        }
    finally:
        db.close()


@router.get("/{file_id}")
async def get_file(file_id: str):
    """Get file metadata."""
    db: Session = SessionLocal()
    try:
        f = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")
        return {
            "id": f.id,
            "filename": f.filename,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
    finally:
        db.close()


@router.delete("/{file_id}")
async def delete_file(file_id: str):
    """Delete a file and its metadata."""
    db: Session = SessionLocal()
    try:
        f = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")

        # Delete from disk
        if f.storage_path and os.path.exists(f.storage_path):
            os.remove(f.storage_path)

        db.delete(f)
        db.commit()
        return {"message": "File deleted"}
    finally:
        db.close()
