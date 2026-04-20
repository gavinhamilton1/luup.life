"""Generate a VAPID keypair for Web Push.

Run once. Paste the output into `backend/.env` and into the `luup-api`
environment on Render. The public key is also sent to the frontend at
runtime via GET /api/push/vapid-public-key — clients don't need to know
the key at build time.

Usage:
    cd backend && python scripts/generate_vapid_keys.py
"""
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def main() -> None:
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key()

    # Private key: raw 32-byte big-endian scalar, base64url.
    priv_scalar = priv.private_numbers().private_value.to_bytes(32, "big")
    private_b64 = _b64url(priv_scalar)

    # Public key: uncompressed EC point (0x04 || X || Y), base64url.
    pub_bytes = pub.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = _b64url(pub_bytes)

    print("# Add to backend/.env (and to luup-api env on Render):")
    print(f"VAPID_PRIVATE_KEY={private_b64}")
    print(f"VAPID_PUBLIC_KEY={public_b64}")


if __name__ == "__main__":
    main()
