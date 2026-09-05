import os

from flask import Flask, request, jsonify
from flask_cors import CORS

from dotenv import load_dotenv

import google.generativeai as genai

import whisper


# ==========================================
# LOAD ENVIRONMENT
# ==========================================

load_dotenv()


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)


# ==========================================
# FLASK
# ==========================================

app = Flask(__name__)

CORS(app)


# ==========================================
# GEMINI
# ==========================================

genai.configure(
    api_key=GEMINI_API_KEY
)


model = genai.GenerativeModel(
    "gemini-2.5-flash"
)


# ==========================================
# WHISPER
# ==========================================

print("Loading Whisper model...")

whisper_model = whisper.load_model(
    "base"
)

print("Whisper loaded.")


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():

    return jsonify({
        "status": "Voice Gemini server running"
    })


# ==========================================
# VOICE PROCESSING
# ==========================================

@app.route(
    "/process-voice",
    methods=["POST"]
)
def process_voice():

    if "audio" not in request.files:

        return jsonify({
            "error": "No audio received"
        }), 400


    audio =
        request.files["audio"]


    file_path = "voice.webm"


    audio.save(file_path)


    try:

        result =
            whisper_model.transcribe(
                file_path
            )


        transcript =
            result["text"].strip()


        return jsonify({

            "transcript":
                transcript

        })


    except Exception as e:

        return jsonify({

            "error":
                str(e)

        }), 500


    finally:

        if os.path.exists(
            file_path
        ):

            os.remove(
                file_path
            )


# ==========================================
# GEMINI
# ==========================================

@app.route(
    "/gemini",
    methods=["POST"]
)
def gemini():

    data =
        request.get_json()


    query =
        data.get(
            "query",
            ""
        ).strip()


    if not query:

        return jsonify({

            "error":
                "Empty query"

        }), 400


    try:

        prompt = f"""
You are a helpful AI assistant.

The user said:

{query}

Answer the user's request clearly.
If the user is asking for content to be
written, provide only the useful content
without unnecessary explanation.
"""


        response =
            model.generate_content(
                prompt
            )


        return jsonify({

            "response":
                response.text

        })


    except Exception as e:

        return jsonify({

            "error":
                str(e)

        }), 500


# ==========================================
# RUN
# ==========================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
