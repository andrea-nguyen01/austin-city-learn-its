import os
import time
import json
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# --- Helper Functions ---
def save_uploaded_file(upload_file: UploadFile) -> str:
    """Saves the uploaded file to a temporary directory."""
    temp_dir = "temp_videos"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, upload_file.filename)
    with open(file_path, "wb") as f:
        f.write(upload_file.file.read())
    return file_path

def poll_file_processing(file):
    """Polls the Gemini API until the file is ready."""
    while file.state.name == "PROCESSING":
        print("Waiting for video processing...")
        time.sleep(10)
        file = genai.get_file(file.name)
    if file.state.name == "FAILED":
        raise HTTPException(status_code=500, detail="Video processing failed.")
    return file

def get_quiz_prompt(rewind_time=5):
    return f"""
    You are an expert in creating educational content. Watch this video and generate a JSON array of 3-5 quiz questions.
    Each question should be based on a distinct moment in the video.

    The JSON object for each question must have the following structure:
    - "id": (String) A unique identifier for the question (e.g., "q1", "question_abc").
    - "trigger_time": (Integer) The timestamp in seconds when the question should appear.
    - "question": (String) The quiz question.
    - "options": (Array of Strings) 4 multiple-choice answers.
    - "correct_index": (Integer) The 0-based index of the correct answer in the "options" array.
    - "rewind_time": (Integer) The timestamp in seconds to rewind to when the user answers incorrectly. This should be {rewind_time} seconds before the trigger_time.

    Example format:
    [
      {{
        "trigger_time": 65,
        "question": "What is the main component being discussed?",
        "options": ["The rotor", "The stator", "The gearbox", "The inverter"],
        "correct_index": 1,
        "rewind_time": 60
      }}
    ]

    Return only the raw JSON array. Do not include any markdown formatting like ```json.
    """

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"status": "Backend is running"}

@app.post("/process-multimodal")
async def process_multimodal(file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a video.")

    try:
        # 1. Save and Upload
        temp_file_path = save_uploaded_file(file)
        print(f"Uploading file: {temp_file_path}")
        video_file = genai.upload_file(path=temp_file_path)

        # 2. Poll until ready
        video_file = poll_file_processing(video_file)
        print(f"File ready: {video_file.name}")

        # 3. Generate Content
        model = genai.GenerativeModel(model_name="gemini-flash-latest")
        prompt = get_quiz_prompt()
        response = model.generate_content([prompt, video_file])

        # 4. Clean up and return
        os.remove(temp_file_path)
        genai.delete_file(video_file.name) # Clean up the file from Gemini API

        # 5. Parse and validate JSON
        try:
            # Clean potential markdown
            cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
            quiz_data = json.loads(cleaned_response)
            return quiz_data
        except json.JSONDecodeError:
            print("Error: Failed to decode JSON from model response.")
            print("Raw response:", response.text)
            raise HTTPException(status_code=500, detail="Failed to parse quiz data from AI model.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Clean up in case of failure
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if 'video_file' in locals() and video_file:
            genai.delete_file(video_file.name)
        raise HTTPException(status_code=500, detail=str(e))
