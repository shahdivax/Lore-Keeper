
let currentSessionId = null;
let isGenerating = false;
let lastScrollPosition = 0;
let baseFontSize = 1.2;
let isTTSActive = false;
let speechSynthesis = window.speechSynthesis;
let speechUtterance = null;

// Genre-Theme Mapping
const genreThemes = {
    fantasy: [
        { value: 'magic', label: 'Magic & Wizardry' },
        { value: 'dragons', label: 'Dragons & Creatures' },
        { value: 'quest', label: 'Epic Quest' },
        { value: 'mythology', label: 'Mythology & Legends' },
        { value: 'medieval', label: 'Medieval Adventure' }
    ],
    'sci-fi': [
        { value: 'space', label: 'Space Exploration' },
        { value: 'ai', label: 'Artificial Intelligence' },
        { value: 'dystopia', label: 'Dystopian Future' },
        { value: 'aliens', label: 'First Contact' },
        { value: 'cyberpunk', label: 'Cyberpunk' }
    ],
    mystery: [
        { value: 'detective', label: 'Detective Story' },
        { value: 'thriller', label: 'Psychological Thriller' },
        { value: 'crime', label: 'Crime Investigation' },
        { value: 'supernatural', label: 'Supernatural Mystery' }
    ],
    romance: [
        { value: 'contemporary', label: 'Contemporary Romance' },
        { value: 'historical', label: 'Historical Romance' },
        { value: 'paranormal', label: 'Paranormal Romance' },
        { value: 'comedy', label: 'Romantic Comedy' }
    ],
    horror: [
        { value: 'supernatural', label: 'Supernatural Horror' },
        { value: 'psychological', label: 'Psychological Horror' },
        { value: 'gothic', label: 'Gothic Horror' },
        { value: 'cosmic', label: 'Cosmic Horror' }
    ],
    historical: [
        { value: 'ancient', label: 'Ancient Civilizations' },
        { value: 'medieval', label: 'Medieval Times' },
        { value: 'renaissance', label: 'Renaissance' },
        { value: 'modern', label: 'Modern History' }
    ],
    adventure: [
        { value: 'exploration', label: 'Exploration' },
        { value: 'survival', label: 'Survival' },
        { value: 'treasure', label: 'Treasure Hunt' },
        { value: 'journey', label: 'Epic Journey' }
    ]
};

// Add this new function to calculate and update the progress bar
function updateProgressBar() {
    const winScroll = window.pageYOffset || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById('progress').style.width = scrolled + '%';
}

// Add scroll event listener to update progress bar
window.addEventListener('scroll', () => {
    updateProgressBar();
});

// Update the existing scroll event listener to include both progress bar and infinite scroll
window.addEventListener('scroll', async () => {
    // Update progress bar
    updateProgressBar();

    // Existing infinite scroll logic
    if (isGenerating || !currentSessionId) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.offsetHeight;
    
    if (scrollPosition > documentHeight - 300 && scrollPosition > lastScrollPosition) {
        isGenerating = true;
        addLoadingIndicator();

        try {
            const response = await fetch('/continue-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: currentSessionId,
                    branch_choice: 'main'
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            removeLoadingIndicator();
            addStoryParagraph(data.continuation);
        } catch (error) {
            console.error('Error:', error);
            removeLoadingIndicator();
        }

        isGenerating = false;
        lastScrollPosition = scrollPosition;
    }
});

function addStoryParagraph(text) {
    const container = document.getElementById('story-container');
    
    // Create a pre element to preserve formatting
    const pre = document.createElement('pre');
    pre.className = 'story-paragraph';
    pre.style.fontSize = `${baseFontSize}rem`;
    pre.textContent = text;
    
    container.appendChild(pre);
    updateReadingTime();
    updateProgressBar();
}

// Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const settingsPanel = document.getElementById('settingsPanel');

menuToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('active');
    document.body.classList.toggle('hide-ui');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== menuToggle) {
        settingsPanel.classList.remove('active');
        document.body.classList.remove('hide-ui');
    }
});

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const themeIcon = document.getElementById('theme-icon');

themeToggle.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', newTheme);
    themeIcon.textContent = newTheme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('theme', newTheme);
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
root.setAttribute('data-theme', savedTheme);
themeIcon.textContent = savedTheme === 'light' ? '🌙' : '☀️';

// Update themes based on genre selection
function updateThemes(genre) {
    const themeSelect = document.getElementById('theme');
    themeSelect.innerHTML = '';
    
    genreThemes[genre].forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.value;
        option.textContent = theme.label;
        themeSelect.appendChild(option);
    });
}

// Reading Time Estimation
function updateReadingTime() {
    const text = document.getElementById('story-container').textContent;
    const wordCount = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 200); // Average reading speed
    document.getElementById('readingTime').textContent = `${minutes} min read`;
}

// Font size controls
function changeFontSize(delta) {
    baseFontSize = Math.max(0.8, Math.min(1.6, baseFontSize + delta * 0.1));
    document.querySelectorAll('.story-paragraph').forEach(p => {
        p.style.fontSize = `${baseFontSize}rem`;
    });
    localStorage.setItem('fontSize', baseFontSize);
}

function updateFontFamily(fontFamily) {
    document.querySelectorAll('.story-paragraph').forEach(p => {
        p.style.fontFamily = fontFamily;
    });
    document.body.style.fontFamily = `${fontFamily}, Georgia, serif`;
}

// Text-to-Speech Functions
function setupTTS() {
    const ttsToggle = document.getElementById('ttsToggle');
    
    ttsToggle.addEventListener('click', () => {
        if (!isTTSActive) {
            startTTS();
        } else {
            stopTTS();
        }
    });
}

function startTTS() {
    if (speechSynthesis && !isTTSActive) {
        const text = document.getElementById('story-container').textContent;
        speechUtterance = new SpeechSynthesisUtterance(text);
        speechUtterance.rate = 0.9;
        speechSynthesis.speak(speechUtterance);
        isTTSActive = true;
        document.getElementById('ttsToggle').classList.add('active');
    }
}

function stopTTS() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
        isTTSActive = false;
        document.getElementById('ttsToggle').classList.remove('active');
    }
}

// Touch Gestures
function setupTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 100;
        const diff = touchEndX - touchStartX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe right - open settings
                settingsPanel.classList.add('active');
                document.body.classList.add('hide-ui');
            } else {
                // Swipe left - close settings
                settingsPanel.classList.remove('active');
                document.body.classList.remove('hide-ui');
            }
        }
    }
}

// Story generation and display
async function startStory() {
    const genre = document.getElementById('genre').value;
    const theme = document.getElementById('theme').value;
    
    try {
        const storyContainer = document.getElementById('story-container');
        // Show initial loading animation only if this is the first story
        if (!currentSessionId) {
            storyContainer.innerHTML = `
                <div class="initial-loading">
                    <div class="quill-loading"></div>
                    <h3>Crafting your story...</h3>
                    <p>Our AI storyteller is weaving a tale just for you</p>
                </div>
            `;
        }
        
        const response = await fetch('/start-story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ genre, theme })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        currentSessionId = data.session_id;
        storyContainer.innerHTML = '';
        addStoryParagraph(data.story);
        settingsPanel.classList.remove('active');
        updateReadingTime();
        stopTTS();
    } catch (error) {
        console.error('Error:', error);
    }
}

function addStoryParagraph(text) {
    const p = document.createElement('p');
    p.className = 'story-paragraph';
    p.style.fontSize = `${baseFontSize}rem`;
    p.textContent = text;
    document.getElementById('story-container').appendChild(p);
    updateReadingTime();
}

function addLoadingIndicator() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    document.getElementById('story-container').appendChild(loading);
}

function removeLoadingIndicator() {
    const loading = document.querySelector('.loading');
    if (loading) loading.remove();
}

// Infinite scroll
window.addEventListener('scroll', async () => {
    if (isGenerating || !currentSessionId) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.offsetHeight;
    
    if (scrollPosition > documentHeight - 300 && scrollPosition > lastScrollPosition) {
        isGenerating = true;
        addLoadingIndicator();

        try {
            const response = await fetch('/continue-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: currentSessionId,
                    branch_choice: 'main'
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            removeLoadingIndicator();
            addStoryParagraph(data.continuation);
        } catch (error) {
            console.error('Error:', error);
            removeLoadingIndicator();
        }

        isGenerating = false;
        lastScrollPosition = scrollPosition;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Setup initial themes
    updateThemes(document.getElementById('genre').value);
    
    // Setup genre change listener
    document.getElementById('genre').addEventListener('change', (e) => {
        updateThemes(e.target.value);
        startStory();
    });

    // Setup theme change listener
    document.getElementById('theme').addEventListener('change', startStory);

    // Setup TTS
    setupTTS();

    // Setup touch gestures
    setupTouchGestures();

    // Setup font family change listener
    document.getElementById('fontFamily').addEventListener('change', (e) => {
        updateFontFamily(e.target.value);
    });

    // Load saved font family
    const savedFontFamily = localStorage.getItem('fontFamily');
    if (savedFontFamily) {
        document.getElementById('fontFamily').value = savedFontFamily;
        updateFontFamily(savedFontFamily);
    }

    // Start initial story
    startStory();
});