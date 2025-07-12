import os
from flask import Flask, jsonify, render_template, request
from google import genai

app = Flask(__name__, static_folder='static')

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
model_id = "gemini-2.0-flash"

# Store active chat sessions (now just message history)
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
        # Start with just the user prompt
        history = [prompt]
        response = client.models.generate_content(
            model=model_id,
            contents=history
        )
        # Store both prompt and model response in history
        sessions[session_id] = {
            'history': history + [response.text],
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
        history = session['history']
        if branch_choice == 'branch':
            prompt = "Continue the story but introduce an unexpected twist that creates a new story branch. Add approximately 300 more words."
        else:
            prompt = "Continue the story naturally from where it left off. Add approximately 300 more words."
        # Add the new user prompt to the history
        history.append(prompt)
        response = client.models.generate_content(
            model=model_id,
            contents=history
        )
        # Add model response to history
        history.append(response.text)
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