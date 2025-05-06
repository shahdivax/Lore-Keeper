import os
from flask import Flask, jsonify, render_template, request
import google.generativeai as genai

app = Flask(__name__, static_folder='static')

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Enhanced generation config
generation_config = {
    "temperature": 0.9,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
}

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    system_instruction="You are a master storyteller who creates engaging, creative stories in any genre."
)

# Store active chat sessions
sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-story', methods=['POST'])
def start_story():
    try:
        data = request.json
        genre = data.get('genre', 'fantasy')
        theme = data.get('theme', 'adventure')
        session_id = os.urandom(16).hex()
        
        prompt = f"Create the beginning of a {genre} story with a {theme} theme. Make it engaging, easy to read, with a good flow and approximately 300 words. also make sure you use easy level of english and simple words."
        
        chat_session = model.start_chat(history=[])
        response = chat_session.send_message(prompt)
        
        sessions[session_id] = {
            'chat_session': chat_session,
            'genre': genre,
            'theme': theme,
            'branch_point': 1
        }
        return jsonify({
            'story': response.text,
            'session_id': session_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/continue-story', methods=['POST'])
def continue_story():
    try:
        data = request.json
        session_id = data.get('session_id')
        branch_choice = data.get('branch_choice', 'main')
        
        if session_id not in sessions:
            return jsonify({'error': 'Invalid session'}), 400
            
        session = sessions[session_id]
        chat_session = session['chat_session']
        
        if branch_choice == 'branch':
            prompt = "Continue the story but introduce an unexpected twist that creates a new story branch."
        else:
            prompt = "Continue the story naturally from where it left off."
            
        response = chat_session.send_message(f"{prompt} Add approximately 300 more words.")
        
        # Generate branch options every 3 chunks
        branch_options = None
        if session['branch_point'] % 3 == 0:
            branch_options = [
                "Continue the main story",
                "Explore an alternative path"
            ]
            
        session['branch_point'] += 1
        
        return jsonify({
            'continuation': response.text,
            'branch_options': branch_options
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run()