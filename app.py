import os
import tempfile

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

import google.generativeai as genai
import whisper

# ============================================================

# LOAD ENVIRONMENT VARIABLES

# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
raise RuntimeError(
"GEMINI_API_KEY is not configured in the environment."
)

# ============================================================

# APPLICATION CONFIGURATION

# ============================================================

app = Flask(**name**)

CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

# ============================================================

# GEMINI CONFIGURATION

# ============================================================

genai.configure(api_key=GEMINI_API_KEY)

gemini_model = genai.GenerativeModel(
"gemini-2.5-flash"
)

# ============================================================

# WHISPER CONFIGURATION

# ============================================================

print("Loading Whisper model...")

whisper_model = whisper.load_model("base")

print("Whisper loaded successfully.")

# ============================================================

# HOME ROUTE

# ============================================================

@app.route("/", methods=["GET"])
def home():
"""Return server status."""

```
return jsonify({
    "status": "Voice Gemini server running"
})
```

# ============================================================

# VOICE PROCESSING

# ============================================================

@app.route("/process-voice", methods=["POST"])
def process_voice():
"""Receive an audio file and convert it to text using Whisper."""

```
if "audio" not in request.files:
    return jsonify({
        "error": "No audio received."
    }), 400

audio = request.files["audio"]

if not audio.filename:
    return jsonify({
        "error": "No audio file selected."
    }), 400

filename = secure_filename(audio.filename)

file_path = None

try:
    # Create a temporary file for the uploaded audio.
    with tempfile.NamedTemporaryFile(
        suffix=os.path.splitext(filename)[1] or ".webm",
        delete=False
    ) as temp_file:

        file_path = temp_file.name

    audio.save(file_path)

    # Transcribe audio using Whisper.
    result = whisper_model.transcribe(
        file_path
    )

    transcript = result.get(
        "text",
        ""
    ).strip()

    return jsonify({
        "transcript": transcript
    })

except Exception as error:
    return jsonify({
        "error": str(error)
    }), 500

finally:
    # Always remove the temporary audio file.
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
```

# ============================================================

# GEMINI PROCESSING

# ============================================================

@app.route("/gemini", methods=["POST"])
def gemini():
"""Send a user query to Gemini and return the response."""

```
data = request.get_json(silent=True)

if not data:
    return jsonify({
        "error": "Invalid or missing JSON request body."
    }), 400

query = data.get(
    "query",
    ""
).strip()

if not query:
    return jsonify({
        "error": "Empty query."
    }), 400

try:
    prompt = f"""
```

You are a helpful AI assistant.

The user said:

{query}

Answer the user's request clearly.

If the user is asking for content to be written,
provide only the useful content without unnecessary
explanation.
"""

```
    response = gemini_model.generate_content(
        prompt
    )

    return jsonify({
        "response": response.text
    })

except Exception as error:
    return jsonify({
        "error": str(error)
    }), 500
```

# ============================================================

# ERROR HANDLERS

# ============================================================

@app.errorhandler(413)
def request_entity_too_large(error):
"""Handle files that exceed the maximum upload size."""

```
return jsonify({
    "error": "Audio file is too large."
}), 413
```

# ============================================================

# APPLICATION ENTRY POINT

# ============================================================

if **name** == "**main**":

```
port = int(
    os.getenv(
        "PORT",
        5000
    )
)

debug = os.getenv(
    "FLASK_DEBUG",
    "false"
).lower() == "true"

app.run(
    host="0.0.0.0",
    port=port,
    debug=debug
)
```
