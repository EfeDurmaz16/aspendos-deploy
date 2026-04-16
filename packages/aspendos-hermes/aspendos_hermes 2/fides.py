"""FIDES Ed25519 signing for Python agents."""

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives import serialization
import base64
import hashlib
import time


def generate_keypair() -> tuple[bytes, bytes]:
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return private_bytes, public_bytes


def generate_did(public_key: bytes) -> str:
    return f"did:key:z6Mk{base64.urlsafe_b64encode(public_key).decode()[:22]}"


class FidesSigner:
    def __init__(self, private_key_bytes: bytes, public_key_bytes: bytes):
        self.private_key = Ed25519PrivateKey.from_private_bytes(private_key_bytes)
        self.public_key_bytes = public_key_bytes
        self.did = generate_did(public_key_bytes)

    def sign(self, payload: str) -> dict:
        data = payload.encode()
        signature = self.private_key.sign(data)
        return {
            "signature": base64.b64encode(signature).decode(),
            "did": self.did,
            "timestamp": int(time.time()),
        }


def sign_payload(private_key_bytes: bytes, payload: str) -> str:
    key = Ed25519PrivateKey.from_private_bytes(private_key_bytes)
    signature = key.sign(payload.encode())
    return base64.b64encode(signature).decode()


def verify_signature(public_key_bytes: bytes, payload: str, signature_b64: str) -> bool:
    try:
        public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        signature = base64.b64decode(signature_b64)
        public_key.verify(signature, payload.encode())
        return True
    except Exception:
        return False
