
import os
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
from pathlib import Path

firebase_creds_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")

if firebase_creds_json:
    firebase_creds_json = firebase_creds_json.strip()
    if not firebase_creds_json:
        raise RuntimeError(
            "FIREBASE_CREDENTIALS_JSON is set on Railway but is empty/blank. "
            "Go to your Railway service -> Variables -> FIREBASE_CREDENTIALS_JSON "
            "and paste the full service-account JSON as its value."
        )
    try:
        cred_dict = json.loads(firebase_creds_json)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"FIREBASE_CREDENTIALS_JSON is set but is not valid JSON ({e}). "
            "Make sure you pasted the ENTIRE contents of your Firebase service "
            "account file, including the outer { } braces, with no extra "
            "surrounding quotes."
        ) from e
    cred = credentials.Certificate(cred_dict)
else:
    BASE_DIR = Path(__file__).resolve().parents[2]
    local_key_path = BASE_DIR / "firebase-key.json"
    if not local_key_path.exists():
        raise RuntimeError(
            f"No FIREBASE_CREDENTIALS_JSON env var found, and local fallback "
            f"file not found at {local_key_path}. "
            "On Railway, set FIREBASE_CREDENTIALS_JSON in the Variables tab. "
            "Locally, make sure firebase-key.json exists at that path."
        )
    cred = credentials.Certificate(local_key_path)

firebase_admin.initialize_app(
    cred,
    {
        "databaseURL": "https://rescue-beacon-76273-default-rtdb.asia-southeast1.firebasedatabase.app/"
    }
)

root_ref = db.reference("/")

