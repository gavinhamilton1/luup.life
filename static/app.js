// static/app.js
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Utility functions
const show = (id) => {
    $$('.view').forEach(v => v.classList.add('hidden'));
    $(id).classList.remove('hidden');
};

const showError = (message) => {
    alert(`Error: ${message}`);
};

const showSuccess = (message) => {
    // Could be replaced with a toast notification
    console.log(`Success: ${message}`);
};

// Global state
let currentSession = {
    type: null,
    id: null,
    expiresAt: null
};

let ws = null;
let whiteboardCtx = null;
let isDrawing = false;
let db = null;

// IndexedDB setup
const DB_NAME = 'luup_sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// IndexedDB functions
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('expiresAt', 'expiresAt', { unique: false });
                store.createIndex('type', 'type', { unique: false });
            }
        };
    });
}

async function saveSession(sessionData) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
            ...sessionData,
            savedAt: new Date().toISOString()
        });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getActiveSessions() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const now = new Date();
            const activeSessions = request.result.filter(session => 
                new Date(session.expiresAt) > now
            );
            resolve(activeSessions);
        };
        request.onerror = () => reject(request.error);
    });
}

async function validateSessionOnServer(sessionId, sessionType) {
    try {
        let endpoint;
        switch (sessionType) {
            case 'photo_share':
                endpoint = `/photo-share/${sessionId}`;
                break;
            case 'chat_room':
                endpoint = `/chat-room/${sessionId}`;
                break;
            case 'whiteboard':
                endpoint = `/whiteboard/${sessionId}`;
                break;
            case 'quick_poll':
                endpoint = `/quick-poll/${sessionId}`;
                break;
            default:
                return false;
        }
        
        const response = await fetch(endpoint);
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function deleteSession(sessionId) {
    if (!db) return;
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(sessionId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function cleanupExpiredSessions() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('expiresAt');
        const now = new Date().toISOString();
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Session management
async function setSession(type, id, expiresAt, metadata = {}) {
    currentSession = { type, id, expiresAt };
    updateTTLDisplay();
    
    // Save to IndexedDB
    try {
        await saveSession({
            id,
            type,
            expiresAt,
            metadata
        });
    } catch (error) {
        console.warn('Failed to save session to IndexedDB:', error);
    }
}

function updateTTLDisplay() {
    if (!currentSession.expiresAt) {
        $('#ttl').textContent = '';
        return;
    }
    
    const left = Math.max(0, new Date(currentSession.expiresAt) - new Date());
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    
    if (left <= 0) {
        $('#ttl').textContent = 'Session expired';
        if (ws && ws.readyState === 1) ws.close();
        showError('Session expired. Data removed.');
        resetToHome();
    } else {
        $('#ttl').textContent = `Session ${currentSession.id} • expires in ${minutes}m ${seconds}s`;
        setTimeout(updateTTLDisplay, 1000);
    }
}

async function resetToHome() {
    currentSession = { type: null, id: null, expiresAt: null };
    currentPhotoSession = null; // Reset photo session tracking
    if (ws) {
        ws.close();
        ws = null;
    }
    
    // Clean up expired sessions from IndexedDB
    try {
        await cleanupExpiredSessions();
    } catch (error) {
        console.warn('Failed to cleanup expired sessions:', error);
    }
    
    show('#home');
}

// Home screen navigation
$('#btnPhotos').onclick = () => show('#photoForm');
$('#btnChat').onclick = () => show('#chatForm');
$('#btnWhiteboard').onclick = () => show('#whiteboardForm');
$('#btnPoll').onclick = () => show('#pollForm');

// Back to home buttons
$('#backToHome').onclick = resetToHome;
$('#backToHomePhotos').onclick = resetToHome;
$('#backToHomeChat').onclick = resetToHome;
$('#backToHomeBoard').onclick = resetToHome;
$('#backToHomePoll').onclick = resetToHome;

// Photo Sharing
$('#photosForm').onsubmit = async (e) => {
e.preventDefault();
const files = $('#photosInput').files;
    
    if (!files.length) {
        showError('Please select at least one image');
        return;
    }
    
    if (files.length > 10) {
        showError('Maximum 10 photos allowed');
        return;
    }
    
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    
    try {
        const response = await fetch('/api/photo-share/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
        
        const data = await response.json();
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        await setSession('photo_share', data.session_id, expiresAt, {
            fileCount: data.files.length,
            files: data.files
        });
        
        // Show QR code
        $('#qr').src = `/api/photo-share/${data.session_id}/qr`;
show('#invite');
        $('#goSession').onclick = () => openPhotoSession(data.session_id);
        
    } catch (error) {
        showError(error.message);
    }
};

async function openPhotoSession(sessionId) {
    try {
        const response = await fetch(`/photo-share/${sessionId}`);
        if (!response.ok) {
            throw new Error('Session not found or expired');
        }
        
        const data = await response.json();
        
        // Set current session for QR code generation
        await setSession('photo_share', sessionId, data.expires_at, {
            fileCount: data.files.length,
            files: data.files
        });
        
        displayPhotos(sessionId, data.files);
        show('#photosView');
        
    } catch (error) {
        showError(error.message);
    }
}

// Track which sessions are currently being displayed
let currentPhotoSession = null;

function displayPhotos(sessionId, files) {
    // Prevent duplicate calls for the same session
    if (currentPhotoSession === sessionId) {
        console.log(`Skipping duplicate displayPhotos call for session ${sessionId}`);
        return;
    }
    
    currentPhotoSession = sessionId;
    const grid = $('#photoGrid');
    grid.innerHTML = '';
    
    console.log('Displaying photos:', files);
    
    files.forEach(filename => {
        const img = document.createElement('img');
        img.alt = filename;
        let retryCount = 0;
        const maxRetries = 2;
        
        const loadImage = () => {
            img.src = `/photo-share/${sessionId}/download/${filename}${retryCount > 0 ? `?retry=${Date.now()}` : ''}`;
        };
        
        // Add error handling and loading states
        img.onload = () => {
            console.log('Image loaded successfully:', filename);
        };
        
        img.onerror = () => {
            console.error('Failed to load image:', filename, 'URL:', img.src, 'Retry:', retryCount);
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying image load for ${filename} (attempt ${retryCount + 1})`);
                setTimeout(loadImage, 100 * retryCount); // Increasing delay
            } else {
                img.alt = `Failed to load: ${filename}`;
                img.style.border = '2px solid red';
                console.error('Max retries reached for image:', filename);
            }
        };
        
        // Start loading the image
        loadImage();
        
        // Change click behavior to show full screen instead of download
        img.onclick = () => showFullscreenImage(img.src, filename);
        grid.appendChild(img);
    });
}

function showFullscreenImage(imageSrc, filename) {
    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.id = 'imageOverlay';
    overlay.className = 'fullscreen-overlay';
    
    // Create image container
    const container = document.createElement('div');
    container.className = 'fullscreen-container';
    
    // Create fullscreen image
    const fullscreenImg = document.createElement('img');
    fullscreenImg.src = imageSrc;
    fullscreenImg.alt = filename;
    fullscreenImg.className = 'fullscreen-image';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'fullscreen-close';
    closeBtn.onclick = () => closeFullscreenImage();
    
    // Create download button
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '⬇';
    downloadBtn.className = 'fullscreen-download';
    downloadBtn.onclick = () => downloadPhoto(imageSrc, filename);
    
    // Create controls container
    const controls = document.createElement('div');
    controls.className = 'fullscreen-controls';
    controls.appendChild(downloadBtn);
    controls.appendChild(closeBtn);
    
    // Assemble the overlay
    container.appendChild(fullscreenImg);
    container.appendChild(controls);
    overlay.appendChild(container);
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            closeFullscreenImage();
        }
    };
    
    // Close on escape key
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeFullscreenImage();
        }
    };
    document.addEventListener('keydown', handleKeydown);
    
    // Add touch support for mobile
    let touchStartY = 0;
    const handleTouchStart = (e) => {
        touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchStartY - touchEndY;
        
        // Close on swipe up gesture (mobile)
        if (swipeDistance > 100) {
            closeFullscreenImage();
        }
    };
    
    overlay.addEventListener('touchstart', handleTouchStart);
    overlay.addEventListener('touchend', handleTouchEnd);
    
    // Store handlers for cleanup
    overlay._keydownHandler = handleKeydown;
    overlay._touchStartHandler = handleTouchStart;
    overlay._touchEndHandler = handleTouchEnd;
}

function closeFullscreenImage() {
    const overlay = $('#imageOverlay');
    if (overlay) {
        // Remove event listeners
        if (overlay._keydownHandler) {
            document.removeEventListener('keydown', overlay._keydownHandler);
        }
        if (overlay._touchStartHandler) {
            overlay.removeEventListener('touchstart', overlay._touchStartHandler);
        }
        if (overlay._touchEndHandler) {
            overlay.removeEventListener('touchend', overlay._touchEndHandler);
        }
        overlay.remove();
    }
}

function downloadPhoto(imageSrc, filename) {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename;
    link.click();
}

$('#showQrPhotos').onclick = () => {
    $('#qr').src = `/api/photo-share/${currentSession.id}/qr`;
    show('#invite');
    $('#goSession').onclick = () => openPhotoSession(currentSession.id);
};

// Chat Room
$('#chatCreateForm').onsubmit = async (e) => {
    e.preventDefault();
    const roomName = $('#chatName').value || 'Chat Room';
    
    try {
        const formData = new FormData();
        formData.append('room_name', roomName);
        
        const response = await fetch('/api/chat-room/create', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create chat room');
        }
        
        const data = await response.json();
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        await setSession('chat_room', data.session_id, expiresAt, {
            roomName: data.room_name
        });
        
        // Show QR code
        $('#qr').src = `/api/chat-room/${data.session_id}/qr`;
        show('#invite');
        $('#goSession').onclick = () => openChatRoom(data.session_id);
        
    } catch (error) {
        showError(error.message);
    }
};

async function openChatRoom(sessionId) {
    try {
        const response = await fetch(`/chat-room/${sessionId}`);
        if (!response.ok) {
            throw new Error('Chat room not found or expired');
        }
        
        const data = await response.json();
        
        // Set current session for QR code generation
        await setSession('chat_room', sessionId, data.expires_at, {
            roomName: data.room_name
        });
        
        $('#chatRoomName').textContent = data.room_name;
        
        // Connect to WebSocket
        connectChatWebSocket(sessionId);
        show('#chatView');
        
    } catch (error) {
        showError(error.message);
    }
}

function connectChatWebSocket(sessionId) {
    if (ws) ws.close();
    
    ws = new WebSocket(`ws://${window.location.host}/ws/chat/${sessionId}`);
    
    ws.onopen = () => {
        console.log('Chat WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        displayChatMessage(message);
    };
    
    ws.onclose = () => {
        console.log('Chat WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
    };
}

function displayChatMessage(message) {
    const chatLog = $('#chatLog');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
        <strong>${message.user || 'Anonymous'}:</strong> ${message.text}
        <small class="muted">${new Date(message.timestamp).toLocaleTimeString()}</small>
    `;
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

$('#chatSend').onsubmit = (e) => {
    e.preventDefault();
    const text = $('#chatText').value.trim();
    
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    const message = {
        text: text,
        timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(message));
    $('#chatText').value = '';
};

$('#showQrChat').onclick = () => {
    $('#qr').src = `/api/chat-room/${currentSession.id}/qr`;
    show('#invite');
    $('#goSession').onclick = () => openChatRoom(currentSession.id);
};

// Whiteboard
$('#whiteboardCreateForm').onsubmit = async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/whiteboard/create', {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create whiteboard');
        }
        
        const data = await response.json();
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        await setSession('whiteboard', data.session_id, expiresAt, {});
        
        // Show QR code
        $('#qr').src = `/api/whiteboard/${data.session_id}/qr`;
        show('#invite');
        $('#goSession').onclick = () => openWhiteboard(data.session_id);
        
    } catch (error) {
        showError(error.message);
    }
};

async function openWhiteboard(sessionId) {
    try {
        const response = await fetch(`/whiteboard/${sessionId}`);
        if (!response.ok) {
            throw new Error('Whiteboard not found or expired');
        }
        
        const data = await response.json();
        
        // Set current session for QR code generation
        await setSession('whiteboard', sessionId, data.expires_at, {});
        
        // Setup canvas
        setupWhiteboard();
        
        // Connect to WebSocket
        connectWhiteboardWebSocket(sessionId);
        show('#whiteboardView');
        
    } catch (error) {
        showError(error.message);
    }
}

function setupWhiteboard() {
    const canvas = $('#board');
    whiteboardCtx = canvas.getContext('2d');
    
    // Set drawing styles
    whiteboardCtx.strokeStyle = '#000000';
    whiteboardCtx.lineWidth = 2;
    whiteboardCtx.lineCap = 'round';
    
    // Mouse events
    canvas.onmousedown = startDrawing;
    canvas.onmousemove = draw;
    canvas.onmouseup = stopDrawing;
    canvas.onmouseout = stopDrawing;
    
    // Touch events for mobile
    canvas.ontouchstart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        startDrawing({
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: canvas
        });
    };
    
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        draw({
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: canvas
        });
    };
    
    canvas.ontouchend = (e) => {
        e.preventDefault();
        stopDrawing();
    };
}

function startDrawing(e) {
    isDrawing = true;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    whiteboardCtx.beginPath();
    whiteboardCtx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    whiteboardCtx.lineTo(x, y);
    whiteboardCtx.stroke();
    
    // Send drawing data to server
    if (ws && ws.readyState === WebSocket.OPEN) {
        const drawingData = {
            type: 'draw',
            x: x,
            y: y,
            isStart: false
        };
        ws.send(JSON.stringify(drawingData));
    }
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        whiteboardCtx.beginPath();
    }
}

function connectWhiteboardWebSocket(sessionId) {
    if (ws) ws.close();
    
    ws = new WebSocket(`ws://${window.location.host}/ws/whiteboard/${sessionId}`);
    
    ws.onopen = () => {
        console.log('Whiteboard WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const drawingData = JSON.parse(event.data);
        if (drawingData.type === 'draw') {
            // Draw on canvas (this could be optimized to avoid self-drawing)
            whiteboardCtx.lineTo(drawingData.x, drawingData.y);
            whiteboardCtx.stroke();
        }
    };
    
    ws.onclose = () => {
        console.log('Whiteboard WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
        console.error('Whiteboard WebSocket error:', error);
    };
}

$('#clearBoard').onclick = () => {
    if (confirm('Clear the whiteboard?')) {
        whiteboardCtx.clearRect(0, 0, $('#board').width, $('#board').height);
    }
};

$('#showQrBoard').onclick = () => {
    $('#qr').src = `/api/whiteboard/${currentSession.id}/qr`;
    show('#invite');
    $('#goSession').onclick = () => openWhiteboard(currentSession.id);
};

// Quick Poll
$('#pollCreateForm').onsubmit = async (e) => {
e.preventDefault();
    
    const questions = [];
    for (let i = 1; i <= 3; i++) {
        const question = $(`#question${i}`).value.trim();
        if (question) questions.push(question);
    }
    
    if (!questions.length) {
        showError('Please enter at least one question');
        return;
    }
    
    const minResponses = parseInt($('#minResponses').value);
    
    try {
        const formData = new FormData();
        questions.forEach(q => formData.append('questions', q));
        formData.append('min_responses', minResponses.toString());
        
        const response = await fetch('/api/quick-poll/create', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create poll');
        }
        
        const data = await response.json();
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        await setSession('quick_poll', data.session_id, expiresAt, {
            questionCount: data.questions.length,
            minResponses: data.min_responses
        });
        
        // Show QR code
        $('#qr').src = `/api/quick-poll/${data.session_id}/qr`;
        show('#invite');
        $('#goSession').onclick = () => openPoll(data.session_id);
        
    } catch (error) {
        showError(error.message);
    }
};

async function openPoll(sessionId) {
    try {
        const response = await fetch(`/quick-poll/${sessionId}`);
        if (!response.ok) {
            throw new Error('Poll not found or expired');
        }
        
        const data = await response.json();
        
        // Set current session for QR code generation
        await setSession('quick_poll', sessionId, data.expires_at, {
            questionCount: data.questions.length,
            minResponses: data.min_responses
        });
        
        displayPoll(sessionId, data);
        show('#pollView');
        
    } catch (error) {
        showError(error.message);
    }
}

function displayPoll(sessionId, pollData) {
    $('#pollTitle').textContent = 'Quick Poll';
    
    const questionsDiv = $('#pollQuestions');
    questionsDiv.innerHTML = '';
    
    pollData.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'poll-question';
        questionDiv.innerHTML = `
            <h4>${question}</h4>
            <div class="poll-options">
                <label><input type="radio" name="q${index}" value="yes"> Yes</label>
                <label><input type="radio" name="q${index}" value="no"> No</label>
                <label><input type="radio" name="q${index}" value="maybe"> Maybe</label>
            </div>
        `;
        questionsDiv.appendChild(questionDiv);
    });
    
    $('#pollMeta').innerHTML = `
        <p>Responses: ${pollData.response_count}/${pollData.min_responses}</p>
        ${pollData.results_shown ? '<p class="success">Results are now visible!</p>' : '<p>Results will show when minimum responses are reached.</p>'}
    `;
    
    // Add submit button if results not shown
    if (!pollData.results_shown) {
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit Response';
        submitBtn.onclick = () => submitPollResponse(sessionId, pollData.questions.length);
        questionsDiv.appendChild(submitBtn);
    } else {
        loadPollResults(sessionId);
    }
}

async function submitPollResponse(sessionId, questionCount) {
    const responses = [];
    for (let i = 0; i < questionCount; i++) {
        const selected = $(`input[name="q${i}"]:checked`);
        if (!selected) {
            showError('Please answer all questions');
            return;
        }
        responses.push(selected.value);
    }
    
    try {
        const formData = new FormData();
        responses.forEach(r => formData.append('responses', r));
        
        const response = await fetch(`/api/quick-poll/${sessionId}/submit`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit response');
        }
        
        const data = await response.json();
        if (data.results_shown) {
            loadPollResults(sessionId);
        } else {
            $('#pollMeta').innerHTML = `
                <p>Responses: ${data.response_count}/${data.min_responses}</p>
                <p>Thank you for your response!</p>
            `;
        }
        
    } catch (error) {
        showError(error.message);
    }
}

async function loadPollResults(sessionId) {
    try {
        const response = await fetch(`/api/quick-poll/${sessionId}/results`);
        if (!response.ok) {
            throw new Error('Failed to load results');
        }
        
        const results = await response.json();
        displayPollResults(results);
        
    } catch (error) {
        showError(error.message);
    }
}

function displayPollResults(results) {
    const resultsDiv = $('#pollResults');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '<h3>Poll Results</h3>';
    
    results.questions.forEach((question, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = `<h4>${question}</h4>`;
        
        const counts = { yes: 0, no: 0, maybe: 0 };
        results.responses.forEach(response => {
            counts[response.responses[index]]++;
        });
        
        const total = results.responses.length;
        resultDiv.innerHTML += `
            <p>Yes: ${counts.yes} (${Math.round(counts.yes/total*100)}%)</p>
            <p>No: ${counts.no} (${Math.round(counts.no/total*100)}%)</p>
            <p>Maybe: ${counts.maybe} (${Math.round(counts.maybe/total*100)}%)</p>
        `;
        
        resultsDiv.appendChild(resultDiv);
    });
}

$('#showQrPoll').onclick = () => {
    $('#qr').src = `/api/quick-poll/${currentSession.id}/qr`;
    show('#invite');
    $('#goSession').onclick = () => openPoll(currentSession.id);
};

// Display active sessions
async function displayActiveSessions() {
    try {
        const activeSessions = await getActiveSessions();
        const sessionsList = $('#activeSessions');
        
        if (activeSessions.length === 0) {
            sessionsList.innerHTML = '<p class="muted">No active sessions</p>';
            return;
        }
        
        sessionsList.innerHTML = activeSessions.map(session => {
            const timeLeft = Math.max(0, new Date(session.expiresAt) - new Date());
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            let sessionInfo = '';
            switch (session.type) {
                case 'photo_share':
                    sessionInfo = `📸 Photo Share (${session.metadata.fileCount} images)`;
                    break;
                case 'chat_room':
                    sessionInfo = `💬 ${session.metadata.roomName || 'Chat Room'}`;
                    break;
                case 'whiteboard':
                    sessionInfo = '🎨 Whiteboard';
                    break;
                case 'quick_poll':
                    sessionInfo = `📊 Poll (${session.metadata.questionCount} questions)`;
                    break;
                default:
                    sessionInfo = 'Unknown Session';
            }
            
            // Show "Expired" if time is up, otherwise show countdown
            const timeDisplay = timeLeft > 0 ? 
                `Expires in ${minutes}m ${seconds}s` : 
                '<span class="error">Expired</span>';
            
            return `
                <div class="session-item" data-session-id="${session.id}" data-type="${session.type}">
                    <div class="session-info">
                        <strong>${sessionInfo}</strong>
                        <small class="muted">${timeDisplay}</small>
                    </div>
                    <button class="session-join-btn" onclick="joinSession('${session.id}', '${session.type}')" 
                            ${timeLeft <= 0 ? 'disabled' : ''}>
                        Join
                    </button>
                    <button class="session-delete-btn" onclick="deleteStoredSession('${session.id}')">
                        ×
                    </button>
                </div>
            `;
        }).join('');
        
        // Refresh the display every 30 seconds to update countdowns
        setTimeout(displayActiveSessions, 30000);
        
    } catch (error) {
        console.warn('Failed to load active sessions:', error);
        $('#activeSessions').innerHTML = '<p class="error">Failed to load sessions</p>';
    }
}

async function joinSession(sessionId, sessionType) {
    try {
        switch (sessionType) {
            case 'photo_share':
                await openPhotoSession(sessionId);
                break;
            case 'chat_room':
                await openChatRoom(sessionId);
                break;
            case 'whiteboard':
                await openWhiteboard(sessionId);
                break;
            case 'quick_poll':
                await openPoll(sessionId);
                break;
        }
    } catch (error) {
        showError('Session not found or expired');
        await deleteStoredSession(sessionId);
        await displayActiveSessions();
    }
}

async function deleteStoredSession(sessionId) {
    try {
        await deleteSession(sessionId);
        await displayActiveSessions();
    } catch (error) {
        console.warn('Failed to delete session:', error);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Luup Life app initialized');
    
    // Initialize IndexedDB
    try {
        await initDB();
        await cleanupExpiredSessions();
        await displayActiveSessions();
    } catch (error) {
        console.warn('IndexedDB initialization failed:', error);
    }
    
    show('#home');
});

// Handle URL routing for direct session access
window.addEventListener('load', () => {
    const path = window.location.pathname;
    
    if (path.startsWith('/photo-share/')) {
        const sessionId = path.split('/')[2];
        openPhotoSession(sessionId);
    } else if (path.startsWith('/chat-room/')) {
        const sessionId = path.split('/')[2];
        openChatRoom(sessionId);
    } else if (path.startsWith('/whiteboard/')) {
        const sessionId = path.split('/')[2];
        openWhiteboard(sessionId);
    } else if (path.startsWith('/quick-poll/')) {
        const sessionId = path.split('/')[2];
        openPoll(sessionId);
    }
});