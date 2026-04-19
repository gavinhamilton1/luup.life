from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class CreateSessionBody(BaseModel):
    type: Literal["chat", "photo"]
    nickname: str = Field(min_length=1, max_length=20)


class JoinSessionBody(BaseModel):
    nickname: str = Field(min_length=1, max_length=20)


class CreateSessionResponse(BaseModel):
    session_id: str
    token: str
    nickname: str
    type: str
    expires_at: int
    join_url: str


class SessionInfo(BaseModel):
    session_id: str
    type: str
    status: str
    created_at: int
    expires_at: int
    participants: list[str] = []
    is_creator: bool = False


class SessionPublicInfo(BaseModel):
    session_id: str
    type: str
    status: str
    expires_at: int


class JoinResponse(BaseModel):
    token: str
    nickname: str
    session_id: str
    type: str
    expires_at: int
    participants: list[str]


class ExtendResponse(BaseModel):
    expires_at: int


class PhotoMeta(BaseModel):
    photo_id: str
    uploader_nickname: str
    width: int
    height: int
    timestamp: int
    signed_url: Optional[str] = None


class PhotoListResponse(BaseModel):
    photos: list[PhotoMeta]


class UploadResponse(BaseModel):
    photo_id: str
    width: int
    height: int
    timestamp: int
    signed_url: str
