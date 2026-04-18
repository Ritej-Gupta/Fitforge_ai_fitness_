import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from google import genai

import os
from flask import send_from_directory
# Load environment variables
load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))
dist_path = os.path.join(basedir, 'dist')

app = Flask(__name__, static_folder=dist_path, template_folder=dist_path, static_url_path="")
CORS(app) # Enable CORS for React development

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise Exception("GEMINI_API_KEY is not set in .env")

# Initialize the NEW google-genai client
client = genai.Client(api_key=api_key)

def call_gemini(prompt):
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        raise Exception(f"Gemini API Error: {str(e)}")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(dist_path, path)):
        return send_from_directory(dist_path, path)
    else:
        return render_template('index.html')

@app.route("/api/workout", methods=["POST"])
def generate_workout():
    data = request.json
    prompt = f"Create a comprehensive weekly workout plan for someone whose goal is {data.get('goal', 'general fitness')} at a {data.get('level', 'beginner')} level. Return it in plain text or simple markdown."
    try:
        return jsonify({"result": call_gemini(prompt)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/meal", methods=["POST"])
def generate_meal():
    data = request.json
    prompt = f"Create a healthy Indian meal plan for 1 day focusing on {data.get('goal', 'weight loss')}. Return it in plain text or simple markdown."
    try:
        return jsonify({"result": call_gemini(prompt)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/calorie", methods=["POST"])
def estimate_calorie():
    data = request.json
    prompt = f"Estimate the calories and macros for this meal: {data.get('food', '')}. Return only a brief estimate."
    try:
        return jsonify({"result": call_gemini(prompt)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/supplement", methods=["POST"])
def supplement_guide():
    data = request.json
    prompt = f"Provide a safe and brief guide on the supplement: {data.get('supplement', '')}. Describe benefits, dosage, and side effects."
    try:
        return jsonify({"result": call_gemini(prompt)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
