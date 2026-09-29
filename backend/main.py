import os
import base64
import json
import logging
import time

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("ai-study-assistant")

ENDPOINT = os.getenv(
    "FOUNDRY_PROJECT_ENDPOINT",
    "https://study-agent-01.services.ai.azure.com/api/projects/AI-study-agent"
)


# =========================================================
# AGENT CONFIGURATION
# =========================================================

NOTES_AGENT = "Notes-Digitizer"
NOTES_VERSION = "7"

VISUALS_AGENT = "Visuals"
VISUALS_VERSION = "6"

QUIZ_AGENT = "quiz-Agent"
QUIZ_VERSION = "8"

REVISION_AGENT = "Revision"
REVISION_VERSION = "8"


# =========================================================
# AZURE FOUNDRY CLIENT
# =========================================================

credential = DefaultAzureCredential()

project_client = AIProjectClient(
    endpoint=ENDPOINT,
    credential=credential,
)

openai_client = project_client.get_openai_client()


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="AI Study Assistant",
    description="AI Study Assistant using Microsoft Foundry Agents",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS enabled: allow_origins=['*'] (any frontend origin, including http://localhost:5173, may call this API)")
logger.info(f"Foundry endpoint configured as: {ENDPOINT}")


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "AI Study Assistant backend is running",
        "agents": {
            "notes": f"{NOTES_AGENT} v{NOTES_VERSION}",
            "visuals": f"{VISUALS_AGENT} v{VISUALS_VERSION}",
            "quiz": f"{QUIZ_AGENT} v{QUIZ_VERSION}",
            "revision": f"{REVISION_AGENT} v{REVISION_VERSION}",
        }
    }


# =========================================================
# HELPER: CALL FOUNDRY AGENT
# =========================================================

def call_agent(agent_name, agent_version, user_input):
    """
    Calls a Microsoft Foundry agent using agent_reference.
    """

    response = openai_client.responses.create(
        input=[
            {
                "role": "user",
                "content": user_input
            }
        ],
        extra_body={
            "agent_reference": {
                "name": agent_name,
                "version": agent_version,
                "type": "agent_reference"
            }
        }
    )

    return response.output_text


# =========================================================
# UPLOAD IMAGE
# =========================================================

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    start_total_time = time.time()
    logger.info(f"==> [/upload-image] Upload request received: filename='{file.filename}', content_type='{file.content_type}'")

    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    allowed_types = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    ]

    if file.content_type not in allowed_types:
        logger.warning(
            f"[/upload-image] Rejected invalid content_type='{file.content_type}'. "
            f"Allowed types: {allowed_types}"
        )
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG, JPEG, PNG or WEBP image."
        )

    # -----------------------------------------------------
    # Read image
    # -----------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        logger.warning(f"[/upload-image] Rejected upload: '{file.filename}' is 0 bytes (empty).")
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    size_kb = len(image_bytes) / 1024
    logger.info(f"[/upload-image] Image loaded: {len(image_bytes)} bytes ({size_kb:.2f} KB)")

    # -----------------------------------------------------
    # Convert image to base64
    # -----------------------------------------------------

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = file.content_type
    image_data_url = f"data:{mime_type};base64,{encoded_image}"

    # =====================================================
    # AGENT 1 — NOTES DIGITIZER
    # =====================================================

    notes_prompt = [
        {
            "type": "input_text",
            "text": """
Analyze the uploaded handwritten educational notes image.

Extract the handwritten content accurately and return structured,
study-ready notes.

Follow your configured Notes-Digitizer instructions exactly.

Important:
- Do not invent information.
- Preserve technical terminology.
- Recover headings, subheadings, bullets, definitions,
  examples, formulas, processes and comparisons.
- Mark unreadable content as [UNCLEAR].
- Return valid JSON only.
"""
        },
        {
            "type": "input_image",
            "image_url": image_data_url
        }
    ]

    logger.info(f"[/upload-image] [1/2] Invoking Notes-Digitizer agent '{NOTES_AGENT}' (v{NOTES_VERSION})...")
    start_notes_time = time.time()

    try:
        notes_response = openai_client.responses.create(
            input=[
                {
                    "role": "user",
                    "content": notes_prompt
                }
            ],
            extra_body={
                "agent_reference": {
                    "name": NOTES_AGENT,
                    "version": NOTES_VERSION,
                    "type": "agent_reference"
                }
            }
        )

        notes_text = notes_response.output_text
        notes_duration = time.time() - start_notes_time
        logger.info(
            f"[/upload-image] [1/2] Notes-Digitizer completed in {notes_duration:.2f}s "
            f"({len(notes_text)} characters received)"
        )

    except Exception as e:
        notes_duration = time.time() - start_notes_time
        logger.error(
            f"[/upload-image] [1/2] Notes-Digitizer failed after {notes_duration:.2f}s: "
            f"{type(e).__name__}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Notes-Digitizer failed: {str(e)}"
        )

    # =====================================================
    # PARSE NOTES JSON
    # =====================================================

    try:
        cleaned_notes = notes_text.strip()

        # Remove markdown JSON fences if agent returns them
        if cleaned_notes.startswith("```"):
            cleaned_notes = cleaned_notes.replace(
                "```json", "", 1
            ).replace(
                "```", "", 1
            ).strip()

        notes_json = json.loads(cleaned_notes)
        logger.info("[[/upload-image] Notes JSON successfully parsed.")

    except Exception as json_err:
        logger.warning(
            f"[/upload-image] Notes text was not strict JSON ({type(json_err).__name__}). "
            f"Preserving raw output."
        )
        notes_json = {
            "raw_output": notes_text
        }

    # =====================================================
    # GUARD: STOP IF IMAGE IS NOT STUDY MATERIAL
    # =====================================================

    if notes_json.get("is_study_material") is False:
        total_duration = time.time() - start_total_time
        logger.info(
            f"[/upload-image] Notes-Digitizer reported is_study_material=false. "
            f"Skipping Visuals agent and remaining study pipeline. "
            f"Completed in {total_duration:.2f}s."
        )
        return {
            "success": True,
            "is_study_material": False,
            "message": "This image does not appear to contain meaningful educational text.",
            "file": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(image_bytes)
            },
            "notes": notes_json,
            "visuals": None,
            "pipeline": [
                {
                    "agent": NOTES_AGENT,
                    "version": NOTES_VERSION,
                    "duration_seconds": round(notes_duration, 2),
                    "status": "completed"
                }
            ]
        }

    # =====================================================
    # AGENT 2 — VISUALS
    # =====================================================

    visuals_prompt = f"""
Create educational visuals from the following structured study notes.

Use your configured Visuals agent instructions exactly.

Do not introduce information that is not present in the notes.

Choose the most suitable visual types such as:
- flowchart
- mindmap
- concept map
- timeline
- comparison
- cycle
- hierarchy

Return valid JSON only.

STRUCTURED NOTES:

{json.dumps(notes_json, ensure_ascii=False, indent=2)}
"""

    logger.info(f"[/upload-image] [2/2] Invoking Visuals agent '{VISUALS_AGENT}' (v{VISUALS_VERSION})...")
    start_visuals_time = time.time()

    try:
        visuals_text = call_agent(
            VISUALS_AGENT,
            VISUALS_VERSION,
            visuals_prompt
        )
        visuals_duration = time.time() - start_visuals_time
        logger.info(
            f"[/upload-image] [2/2] Visuals agent completed in {visuals_duration:.2f}s "
            f"({len(visuals_text)} characters received)"
        )

    except Exception as e:
        visuals_duration = time.time() - start_visuals_time
        logger.error(
            f"[/upload-image] [2/2] Visuals agent failed after {visuals_duration:.2f}s: "
            f"{type(e).__name__}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Visuals agent failed: {str(e)}"
        )

    # =====================================================
    # PARSE VISUALS JSON
    # =====================================================

    try:
        cleaned_visuals = visuals_text.strip()

        if cleaned_visuals.startswith("```"):
            cleaned_visuals = cleaned_visuals.replace(
                "```json", "", 1
            ).replace(
                "```", "", 1
            ).strip()

        visuals_json = json.loads(cleaned_visuals)
        logger.info("[/upload-image] Visuals JSON successfully parsed.")

    except Exception as json_err:
        logger.warning(
            f"[/upload-image] Visuals text was not strict JSON ({type(json_err).__name__}). "
            f"Preserving raw output."
        )
        visuals_json = {
            "raw_output": visuals_text
        }

    total_duration = time.time() - start_total_time
    logger.info(
        f"<== [/upload-image] Completed successfully in {total_duration:.2f}s "
        f"(Notes: {notes_duration:.2f}s, Visuals: {visuals_duration:.2f}s)"
    )

    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "success": True,

        "file": {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(image_bytes)
        },

        "notes": notes_json,

        "visuals": visuals_json,

        "pipeline": [
            {
                "agent": NOTES_AGENT,
                "version": NOTES_VERSION,
                "duration_seconds": round(notes_duration, 2),
                "status": "completed"
            },
            {
                "agent": VISUALS_AGENT,
                "version": VISUALS_VERSION,
                "duration_seconds": round(visuals_duration, 2),
                "status": "completed"
            }
        ]
    }


# =========================================================
# REQUEST MODEL FOR QUIZ
# =========================================================

class QuizRequest(BaseModel):

    notes: dict | None = None
    visuals: dict | None = None
    chat_history: list[str] = []

    question_count: int = 5

    difficulty: str = "mixed"


# =========================================================
# AGENT 3 — QUIZ
# =========================================================

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):

    # Log request receipt and payload sizes
    notes_json = json.dumps(request.notes or {}, ensure_ascii=False)
    visuals_json = json.dumps(request.visuals or {}, ensure_ascii=False)
    logger.info(
        f"[/generate-quiz] request received – notes size {len(notes_json)} bytes, "
        f"visuals size {len(visuals_json)} bytes, chat_history length {len(request.chat_history)}"
    )
    start_time = time.time()

    if not request.notes:
        raise HTTPException(
            status_code=400,
            detail="Notes are required to generate a quiz."
        )

    quiz_prompt = f"""
Create a quiz for the student using ONLY the supplied study material.

Follow your configured Quiz-Agent instructions exactly.

Difficulty: {request.difficulty}
Number of questions: {request.question_count}

Study Notes:
{json.dumps(request.notes, ensure_ascii=False, indent=2)}

Visual Information:
{json.dumps(request.visuals or {}, ensure_ascii=False, indent=2)}

CRITICAL OUTPUT REQUIREMENT:
You MUST return ONLY a valid JSON array. No markdown, no explanation, no extra text.
The array must contain exactly {request.question_count} question objects.

Each question object must follow this exact schema:
{{
  "id": 1,
  "topic": "short topic label",
  "question": "The question text here?",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctAnswer": "The exact text of the correct option (must match one of options exactly)",
  "explanation": "Brief explanation of why the answer is correct"
}}

Return ONLY the JSON array, starting with [ and ending with ]. Nothing else.
"""

    try:
        quiz_text = call_agent(
            QUIZ_AGENT,
            QUIZ_VERSION,
            quiz_prompt
        )

        duration = time.time() - start_time
        logger.info(
            f"[/generate-quiz] Quiz agent completed in {duration:.2f}s "
            f"({len(quiz_text)} characters received)"
        )

    except Exception as e:
        logger.error(f"[/generate-quiz] agent call failed: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Quiz-Agent failed: {str(e)}"
        )

    # ----------------------------------------------------------
    # Parse agent output into a proper JSON array
    # ----------------------------------------------------------
    try:
        cleaned = quiz_text.strip()

        # Strip markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```", 2)[-1] if cleaned.count("```") >= 2 else cleaned
            cleaned = cleaned.replace("json", "", 1).strip()
            # Remove trailing fence
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3].strip()

        # Find the first [ and last ] to extract the array
        start_idx = cleaned.find("[")
        end_idx = cleaned.rfind("]")

        if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
            logger.error(
                f"[/generate-quiz] Agent did not return a JSON array. "
                f"Raw output (first 500 chars): {quiz_text[:500]}"
            )
            raise HTTPException(
                status_code=500,
                detail="Quiz-Agent did not return a valid question list. Please try again."
            )

        array_str = cleaned[start_idx:end_idx + 1]
        quiz_array = json.loads(array_str)

        if not isinstance(quiz_array, list) or len(quiz_array) == 0:
            raise HTTPException(
                status_code=500,
                detail="Quiz-Agent returned an empty question list. Please try again."
            )

        logger.info(f"[/generate-quiz] Successfully parsed {len(quiz_array)} questions.")

    except HTTPException:
        raise
    except Exception as parse_err:
        logger.error(
            f"[/generate-quiz] Failed to parse quiz JSON: {type(parse_err).__name__}: {str(parse_err)}. "
            f"Raw output (first 500 chars): {quiz_text[:500]}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Quiz response could not be parsed: {str(parse_err)}"
        )

    total_duration = time.time() - start_time
    logger.info(f"[/generate-quiz] Total duration: {total_duration:.2f}s")

    return {
        "success": True,
        "agent": QUIZ_AGENT,
        "version": QUIZ_VERSION,
        "quiz": quiz_array
    }


# =========================================================
# REQUEST MODEL FOR REVISION
# =========================================================

class RevisionRequest(BaseModel):

    notes: dict | None = None
    visuals: dict | None = None
    quiz_result: str | None = None


# =========================================================
# AGENT 4 — REVISION
# =========================================================

@app.post("/generate-revision")
async def generate_revision(request: RevisionRequest):

    if not request.notes:
        raise HTTPException(
            status_code=400,
            detail="Notes are required for revision."
        )


    revision_prompt = f"""
Create a revision guide for the student using ONLY the
provided study material.

Follow your configured Revision agent instructions exactly.

Include useful revision information such as:
- key points
- important definitions
- important keywords
- weak areas if quiz results are available
- exam-focused revision
- quick last-minute revision points

Do not invent information.

STUDY NOTES:
{json.dumps(request.notes, ensure_ascii=False, indent=2)}

VISUALS:
{json.dumps(request.visuals or {}, ensure_ascii=False, indent=2)}

QUIZ RESULT:
{request.quiz_result or "No quiz result available."}
"""


    try:

        revision_text = call_agent(
            REVISION_AGENT,
            REVISION_VERSION,
            revision_prompt
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Revision agent failed: {str(e)}"
        )


    return {
        "success": True,
        "agent": REVISION_AGENT,
        "version": REVISION_VERSION,
        "revision": revision_text
    }