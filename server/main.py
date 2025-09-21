# server/main.py
import asyncio
import base64
import io
import json
import mimetypes
import os
import secrets
import shutil
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from fastapi import (
    FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Request
)
from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

import redis.asyncio as aioredis
from PIL import Image, ImageOps
import hmac
import hashlib

try:
    import qrcode
except ImportError:
    qrcode = None  # pip install qrcode[pil]

# Configuration
SESSION_TTL_MINUTES = 20
SESSION_TTL = timedelta(minutes=SESSION_TTL_MINUTES)
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB per image
MAX_SESSION_BYTES = 64 * 1024 * 1024  # 64 MB per session total assets
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"}

# Image Optimization Settings - Aggressive compression for mobile sharing
MAX_IMG_SIDE = int(os.getenv("MAX_IMG_SIDE", "1200"))  # Maximum width or height for resizing (reduced for smaller files)
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "75"))  # JPEG compression quality (1-100) - more aggressive compression
# Quality automatically reduced to 65% for >2MP images, 50% for >5MP images

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:8000")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:9000")  # used in QR links
HMAC_SECRET = os.getenv("HMAC_SECRET", secrets.token_hex(32))  # set in prod
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
STATIC_DIR = os.path.join(ROOT_DIR, "static")
TMP_DIR = os.path.join(ROOT_DIR, "tmp_data")
os.makedirs(TMP_DIR, exist_ok=True)

# Session types
class SessionType:
    PHOTO_SHARE = "photo_share"
    CHAT_ROOM = "chat_room"
    WHITEBOARD = "whiteboard"
    QUICK_POLL = "quick_poll"

# --- Security headers middleware ---
class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            resp = await call_next(request)
            return resp
        except Exception as e:
            return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

# Create FastAPI app
app = FastAPI(title="Luup Life", version="1.0.0")

# Add middleware
app.add_middleware(SecurityHeaders)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for mobile access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Global variables
redis_client = None
active_connections: Dict[str, WebSocket] = {}
# In-memory fallback storage
memory_storage: Dict[str, dict] = {}

# Initialize Redis connection
async def get_redis():
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(REDIS_URL)
            # Test connection
            await redis_client.ping()
        except Exception as e:
            # Silently fall back to in-memory storage
            redis_client = None
    return redis_client

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    await get_redis()
    # Start session cleanup task
    asyncio.create_task(cleanup_expired_sessions())

@app.on_event("shutdown")
async def shutdown_event():
    global redis_client
    if redis_client:
        await redis_client.close()

# Session management functions
async def create_session(session_type: str, data: dict = None) -> str:
    """Create a new session and return session ID"""
    session_id = str(uuid.uuid4())
    session_data = {
        "type": session_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + SESSION_TTL).isoformat(),
        "data": data or {}
    }
    
    redis = await get_redis()
    if redis:
        await redis.setex(f"session:{session_id}", SESSION_TTL.total_seconds(), json.dumps(session_data))
    else:
        # Use in-memory storage
        memory_storage[session_id] = session_data
    
    return session_id

async def get_session(session_id: str) -> Optional[dict]:
    """Get session data by ID with grace period"""
    # Add 2-minute grace period for session access
    grace_period = timedelta(minutes=2)
    now = datetime.now(timezone.utc)
    
    redis = await get_redis()
    if redis:
        try:
            data = await redis.get(f"session:{session_id}")
            if data:
                session_data = json.loads(data)
                # Check if session is within grace period
                expires_at = datetime.fromisoformat(session_data["expires_at"])
                if now > expires_at + grace_period:
                    return None
                return session_data
        except Exception as e:
            print(f"Redis error in get_session: {e}")
            # Fall through to in-memory storage
    
    # Check in-memory storage
    session_data = memory_storage.get(session_id)
    if session_data:
        # Check if expired with grace period
        expires_at = datetime.fromisoformat(session_data["expires_at"])
        if now > expires_at + grace_period:
            del memory_storage[session_id]
            return None
        return session_data
    return None

async def update_session(session_id: str, data: dict):
    """Update session data"""
    session_data = await get_session(session_id)
    if session_data:
        session_data["data"].update(data)
        
        redis = await get_redis()
        if redis:
            try:
                await redis.setex(f"session:{session_id}", SESSION_TTL.total_seconds(), json.dumps(session_data))
            except Exception as e:
                print(f"Redis error in update_session: {e}")
                # Fall through to in-memory storage
        
        # Update in-memory storage (always do this as backup)
        memory_storage[session_id] = session_data

async def delete_session(session_id: str):
    """Delete session and all associated data"""
    redis = await get_redis()
    if redis:
        try:
            await redis.delete(f"session:{session_id}")
        except Exception as e:
            print(f"Redis error in delete_session: {e}")
    
    # Remove from in-memory storage (always do this)
    memory_storage.pop(session_id, None)
    
    # Clean up files for photo sessions
    session_data = await get_session(session_id)
    if session_data and session_data.get("type") == SessionType.PHOTO_SHARE:
        session_dir = os.path.join(TMP_DIR, session_id)
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)

async def cleanup_expired_sessions():
    """Background task to clean up expired sessions with grace period"""
    while True:
        try:
            # Add 5-minute grace period to avoid deleting sessions too aggressively
            grace_period = timedelta(minutes=5)
            cutoff_time = datetime.now(timezone.utc) - grace_period
            
            redis = await get_redis()
            if redis:
                keys = await redis.keys("session:*")
                
                for key in keys:
                    session_data = await redis.get(key)
                    if session_data:
                        data = json.loads(session_data)
                        expires_at = datetime.fromisoformat(data["expires_at"])
                        # Only delete if expired AND past grace period
                        if expires_at < cutoff_time:
                            session_id = key.decode().replace("session:", "")
                            await delete_session(session_id)
            else:
                # Clean up in-memory storage with grace period
                expired_sessions = []
                for session_id, session_data in memory_storage.items():
                    expires_at = datetime.fromisoformat(session_data["expires_at"])
                    # Only delete if expired AND past grace period
                    if expires_at < cutoff_time:
                        expired_sessions.append(session_id)
                
                for session_id in expired_sessions:
                    await delete_session(session_id)
            
            await asyncio.sleep(300)  # Check every 5 minutes instead of every minute
        except Exception as e:
            print(f"Error in cleanup task: {e}")
            await asyncio.sleep(300)

# QR Code generation
def generate_qr_code(data: str) -> bytes:
    """Generate QR code as PNG bytes"""
    if qrcode is None:
        raise HTTPException(status_code=500, detail="QR code generation not available")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

# Routes
@app.get("/")
async def read_root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

def process_and_save_image(image_data: bytes, filename: str, session_dir: str) -> tuple[str, int]:
    """
    Process and optimize image for maximum storage and bandwidth efficiency:
    - Resize images larger than MAX_IMG_SIDE (default 1200px) while maintaining aspect ratio
    - Convert all images to JPEG format for better compression
    - Handle transparency by adding white background
    - Use aggressive JPEG compression (default 75% quality, 65% for very large images)
    - Generate progressive JPEGs for faster loading
    - Create random filenames for privacy and to avoid conflicts
    - Preserve image orientation from EXIF data (fixes rotated photos from mobile)
    - Ensure filename uniqueness with timestamp + random suffix
    - Returns (processed_filename, file_size)
    """
    try:
        # Open image with PIL
        image = Image.open(io.BytesIO(image_data))
        
        # Preserve orientation from EXIF data using PIL's built-in method
        try:
            # This automatically rotates the image based on EXIF orientation data
            image = ImageOps.exif_transpose(image)
        except Exception:
            # If EXIF transpose fails, continue without orientation correction
            pass
        
        # Store original dimensions for logging (after orientation correction)
        original_width, original_height = image.size
        
        # Convert RGBA to RGB if necessary (for JPEG compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background for transparent images
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large (maintain aspect ratio)
        if image.width > MAX_IMG_SIDE or image.height > MAX_IMG_SIDE:
            image.thumbnail((MAX_IMG_SIDE, MAX_IMG_SIDE), Image.Resampling.LANCZOS)
        
        # Generate random filename to avoid conflicts and preserve privacy
        # Use timestamp + random string for uniqueness
        timestamp = int(time.time() * 1000)  # milliseconds
        random_suffix = secrets.token_hex(4)  # 8 character random string
        processed_filename = f"img_{timestamp}_{random_suffix}.jpg"
        
        # Ensure filename is truly unique (very unlikely but safety check)
        counter = 1
        original_processed_filename = processed_filename
        while os.path.exists(os.path.join(session_dir, processed_filename)):
            name_part = os.path.splitext(original_processed_filename)[0]
            processed_filename = f"{name_part}_{counter}.jpg"
            counter += 1
        
        # Save as JPEG with aggressive optimization for smaller file sizes
        output_path = os.path.join(session_dir, processed_filename)
        
        # Additional optimizations for smaller file sizes
        save_kwargs = {
            'quality': JPEG_QUALITY,
            'optimize': True,
            'progressive': True,
            'format': 'JPEG'
        }
        
        # For very large images, use even more aggressive compression
        if original_width * original_height > 2000000:  # > 2 megapixels
            save_kwargs['quality'] = max(JPEG_QUALITY - 10, 60)  # Reduce quality further for large images
        
        # For extremely large images (> 5 megapixels), use maximum compression
        if original_width * original_height > 5000000:
            save_kwargs['quality'] = max(JPEG_QUALITY - 20, 50)  # Maximum compression for huge images
        
        # Save image and ensure it's flushed to disk
        with open(output_path, 'wb') as f:
            image.save(f, **save_kwargs)
            f.flush()  # Ensure data is written to disk
            os.fsync(f.fileno())  # Force OS to write to disk
        
        # Get file size
        file_size = os.path.getsize(output_path)
        
        # Log compression info with new filename
        original_size = len(image_data)
        compression_ratio = (1 - file_size / original_size) * 100
        new_width, new_height = image.size
        print(f"Image {filename} -> {processed_filename}: {original_width}x{original_height} {original_size:,} bytes -> {new_width}x{new_height} {file_size:,} bytes ({compression_ratio:.1f}% reduction)")
        
        return processed_filename, file_size
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image {filename}: {str(e)}")

# Photo Sharing Routes
@app.post("/api/photo-share/upload")
async def upload_photos(files: List[UploadFile] = File(...)):
    """Upload photos and create a photo sharing session"""
    if len(files) > 10:  # Limit to 10 photos
        raise HTTPException(status_code=400, detail="Maximum 10 photos allowed")
    
    session_id = await create_session(SessionType.PHOTO_SHARE)
    session_dir = os.path.join(TMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    uploaded_files = []
    total_size = 0
    
    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
        
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"File too large: {file.filename}")
        
        # Process and save image
        processed_filename, file_size = process_and_save_image(content, file.filename, session_dir)
        
        total_size += file_size
        if total_size > MAX_SESSION_BYTES:
            raise HTTPException(status_code=400, detail="Total session size exceeded")
        
        uploaded_files.append(processed_filename)
    
    await update_session(session_id, {"files": uploaded_files})
    
    return {"session_id": session_id, "files": uploaded_files}

@app.get("/api/photo-share/{session_id}/qr")
async def get_photo_share_qr(session_id: str):
    """Generate QR code for photo sharing session"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.PHOTO_SHARE:
        raise HTTPException(status_code=404, detail="Session not found")
    
    qr_url = f"{PUBLIC_BASE_URL}/photo-share/{session_id}"
    qr_bytes = generate_qr_code(qr_url)
    
    return StreamingResponse(io.BytesIO(qr_bytes), media_type="image/png")

@app.get("/photo-share/{session_id}")
async def view_photos(session_id: str):
    """View photos in a session"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.PHOTO_SHARE:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    files = session_data["data"].get("files", [])
    return {
        "session_id": session_id, 
        "files": files,
        "expires_at": session_data["expires_at"]
    }

@app.get("/photo-share/{session_id}/download/{filename}")
@app.head("/photo-share/{session_id}/download/{filename}")
async def download_photo(session_id: str, filename: str):
    """Download a specific photo"""
    try:
        session_data = await get_session(session_id)
        if not session_data or session_data["type"] != SessionType.PHOTO_SHARE:
            print(f"Session not found or expired: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found or expired")
        
        file_path = os.path.join(TMP_DIR, session_id, filename)
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check file size to ensure it's not empty
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            print(f"File is empty: {file_path}")
            raise HTTPException(status_code=404, detail="File is empty")
        
        print(f"Serving file: {filename} ({file_size} bytes) for session {session_id}")
        
        # Set proper MIME type and CORS headers for JPEG images
        return FileResponse(
            file_path, 
            filename=filename,
            media_type="image/jpeg",
            headers={
                "Content-Type": "image/jpeg",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD",
                "Access-Control-Allow-Headers": "*",
                "Cache-Control": "public, max-age=300"  # Cache for 5 minutes
            }
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Error serving file {filename} for session {session_id}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")

# Chat Room Routes
@app.post("/api/chat-room/create")
async def create_chat_room(room_name: str = Form(...)):
    """Create a new chat room"""
    session_id = await create_session(SessionType.CHAT_ROOM, {"name": room_name, "messages": []})
    return {"session_id": session_id, "room_name": room_name}

@app.get("/api/chat-room/{session_id}/qr")
async def get_chat_room_qr(session_id: str):
    """Generate QR code for chat room"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.CHAT_ROOM:
        raise HTTPException(status_code=404, detail="Session not found")
    
    qr_url = f"{PUBLIC_BASE_URL}/chat-room/{session_id}"
    qr_bytes = generate_qr_code(qr_url)
    
    return StreamingResponse(io.BytesIO(qr_bytes), media_type="image/png")

@app.get("/chat-room/{session_id}")
async def get_chat_room(session_id: str):
    """Get chat room data"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.CHAT_ROOM:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    return {
        "session_id": session_id, 
        "room_name": session_data["data"]["name"],
        "expires_at": session_data["expires_at"]
    }

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_to_session(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

manager = ConnectionManager()

@app.websocket("/ws/chat/{session_id}")
async def chat_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Save message to session
            session_data = await get_session(session_id)
            if session_data:
                messages = session_data["data"].get("messages", [])
                messages.append({
                    "id": str(uuid.uuid4()),
                    "text": message_data["text"],
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                await update_session(session_id, {"messages": messages})
                
                # Broadcast to all connected clients
                await manager.send_to_session(message_data, session_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

# Whiteboard Routes
@app.post("/api/whiteboard/create")
async def create_whiteboard():
    """Create a new whiteboard session"""
    session_id = await create_session(SessionType.WHITEBOARD, {"drawings": []})
    return {"session_id": session_id}

@app.get("/api/whiteboard/{session_id}/qr")
async def get_whiteboard_qr(session_id: str):
    """Generate QR code for whiteboard"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.WHITEBOARD:
        raise HTTPException(status_code=404, detail="Session not found")
    
    qr_url = f"{PUBLIC_BASE_URL}/whiteboard/{session_id}"
    qr_bytes = generate_qr_code(qr_url)
    
    return StreamingResponse(io.BytesIO(qr_bytes), media_type="image/png")

@app.get("/whiteboard/{session_id}")
async def get_whiteboard(session_id: str):
    """Get whiteboard data"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.WHITEBOARD:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    return {
        "session_id": session_id, 
        "drawings": session_data["data"].get("drawings", []),
        "expires_at": session_data["expires_at"]
    }

@app.websocket("/ws/whiteboard/{session_id}")
async def whiteboard_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            drawing_data = json.loads(data)
            
            # Save drawing to session
            session_data = await get_session(session_id)
            if session_data:
                drawings = session_data["data"].get("drawings", [])
                drawings.append(drawing_data)
                await update_session(session_id, {"drawings": drawings})
                
                # Broadcast to all connected clients
                await manager.send_to_session(drawing_data, session_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

# Quick Poll Routes
@app.post("/api/quick-poll/create")
async def create_quick_poll(
    questions: List[str] = Form(...),
    min_responses: int = Form(...)
):
    """Create a new quick poll"""
    if len(questions) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 questions allowed")
    
    if min_responses < 1:
        raise HTTPException(status_code=400, detail="Minimum responses must be at least 1")
    
    session_id = await create_session(SessionType.QUICK_POLL, {
        "questions": questions,
        "min_responses": min_responses,
        "responses": [],
        "results_shown": False
    })
    return {"session_id": session_id, "questions": questions, "min_responses": min_responses}

@app.get("/api/quick-poll/{session_id}/qr")
async def get_quick_poll_qr(session_id: str):
    """Generate QR code for quick poll"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.QUICK_POLL:
        raise HTTPException(status_code=404, detail="Session not found")
    
    qr_url = f"{PUBLIC_BASE_URL}/quick-poll/{session_id}"
    qr_bytes = generate_qr_code(qr_url)
    
    return StreamingResponse(io.BytesIO(qr_bytes), media_type="image/png")

@app.get("/quick-poll/{session_id}")
async def get_quick_poll(session_id: str):
    """Get quick poll data"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.QUICK_POLL:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    data = session_data["data"]
    return {
        "session_id": session_id,
        "questions": data["questions"],
        "min_responses": data["min_responses"],
        "response_count": len(data["responses"]),
        "results_shown": data["results_shown"],
        "expires_at": session_data["expires_at"]
    }

@app.post("/api/quick-poll/{session_id}/submit")
async def submit_poll_response(session_id: str, responses: List[str] = Form(...)):
    """Submit poll responses"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.QUICK_POLL:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if session_data["data"]["results_shown"]:
        raise HTTPException(status_code=400, detail="Poll results have already been shown")
    
    if len(responses) != len(session_data["data"]["questions"]):
        raise HTTPException(status_code=400, detail="Number of responses must match number of questions")
    
    # Add response
    poll_responses = session_data["data"]["responses"]
    poll_responses.append({
        "id": str(uuid.uuid4()),
        "responses": responses,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Check if we should show results
    results_shown = len(poll_responses) >= session_data["data"]["min_responses"]
    
    await update_session(session_id, {
        "responses": poll_responses,
        "results_shown": results_shown
    })
    
    return {
        "response_count": len(poll_responses),
        "results_shown": results_shown,
        "min_responses": session_data["data"]["min_responses"]
    }

@app.get("/api/quick-poll/{session_id}/results")
async def get_poll_results(session_id: str):
    """Get poll results"""
    session_data = await get_session(session_id)
    if not session_data or session_data["type"] != SessionType.QUICK_POLL:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if not session_data["data"]["results_shown"]:
        raise HTTPException(status_code=400, detail="Results not yet available")
    
    return {
        "session_id": session_id,
        "questions": session_data["data"]["questions"],
        "responses": session_data["data"]["responses"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)