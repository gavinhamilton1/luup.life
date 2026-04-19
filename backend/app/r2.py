from __future__ import annotations

import asyncio
import logging
from typing import Optional

import boto3
from botocore.config import Config

from .config import settings

logger = logging.getLogger(__name__)

_client = None


def get_r2():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
            ),
        )
    return _client


async def put_object(key: str, body: bytes, content_type: str) -> None:
    def _put():
        get_r2().put_object(
            Bucket=settings.r2_bucket_name,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

    await asyncio.to_thread(_put)


async def delete_object(key: str) -> None:
    def _delete():
        get_r2().delete_object(Bucket=settings.r2_bucket_name, Key=key)

    try:
        await asyncio.to_thread(_delete)
        logger.info("r2 delete ok: %s", key)
    except Exception as e:
        logger.exception("r2 delete failed: key=%s err=%s", key, e)
        raise


async def delete_prefix(prefix: str) -> int:
    """Delete every object under a prefix. Returns number of objects deleted."""
    def _delete() -> int:
        client = get_r2()
        paginator = client.get_paginator("list_objects_v2")
        total = 0
        for page in paginator.paginate(Bucket=settings.r2_bucket_name, Prefix=prefix):
            contents = page.get("Contents") or []
            if not contents:
                continue
            client.delete_objects(
                Bucket=settings.r2_bucket_name,
                Delete={"Objects": [{"Key": o["Key"]} for o in contents]},
            )
            total += len(contents)
        return total

    try:
        deleted = await asyncio.to_thread(_delete)
        logger.info("r2 delete_prefix ok: prefix=%s count=%d", prefix, deleted)
        return deleted
    except Exception as e:
        logger.exception("r2 delete_prefix failed: prefix=%s err=%s", prefix, e)
        raise


async def presign_url(key: str, expires: int = 900, download_filename: Optional[str] = None) -> str:
    def _sign():
        params = {"Bucket": settings.r2_bucket_name, "Key": key}
        if download_filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{download_filename}"'
        return get_r2().generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires,
        )

    return await asyncio.to_thread(_sign)
