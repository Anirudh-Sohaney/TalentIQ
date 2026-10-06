#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
import os
import sys
from pathlib import Path
from huggingface_hub import snapshot_download

MODEL_ID = "Systran/faster-whisper-small.en"
REVISION = "main"
MODEL_DIR = Path("models") / "faster-whisper-small.en"
MANIFEST_PATH = Path("models") / "manifest.json"
HF_CACHE = Path(".cache") / "huggingface"

REQUIRED_FILES = [
    "model.bin",
    "config.json",
    "tokenizer.json",
    "vocabulary.txt",
    "README.md",
]

def main() -> int:
    os.environ["HF_HOME"] = str(HF_CACHE)
    MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {MODEL_ID}@{REVISION}...")
    try:
        path = snapshot_download(
            MODEL_ID,
            revision=REVISION,
            local_dir=str(MODEL_DIR),
            local_dir_use_symlinks=False,
        )
        print(f"Downloaded to {path}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
