const { BrowserWindow } = require('electron');

let backendWs = null;
let isConnected = false;
let claudeResponse = '';
let currentSystemPrompt = null;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if(windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function connectToBackend(url = 'ws://localhost:3000/ws') {
    return new Promise((resolve, reject) => {
        console.log('[Backend] Connecting to:', url);

        const WebSocket = require('ws');
        backendWs = new WebSocket(url);

        backendWs.on('open', () => {
            console.log('[Backend] Connected');
            isConnected = true;
            resolve(true);
        });

        backendWs.on('message', (event) => {
            const data = JSON.parse(event.toString());

            if(data.type === 'transcription') {
                console.log('[Backend] Transcription:', data.text);
            }

            if(data.type === 'response_start') {
                claudeResponse = '';
            }

            if(data.type === 'response_chunk') {
                claudeResponse += data.text;
            }

            if(data.type === 'response_end') {
                console.log('[Backend] Claude:', claudeResponse);
            }

            if(data.type === 'error') {
                console.log('[Backend] Error:', data.message);
            }
        });

        backendWs.on('error', (err) => {
            console.error('[Backend] Connection error:', err.message);
            reject(err);
        });

        backendWs.on('close', () => {
            console.log('[Backend] Disconnected');
            isConnected = false;
        });
    });
}

function sendAudioToBackend(base64Data) {
    if(!backendWs || !isConnected) return;

    const binary = Buffer.from(base64Data, 'base64');
    backendWs.send(binary);
}

function requestTranscription() {
    if(!backendWs || !isConnected) return;
    console.log('[Backend] Requesting transcription...');
    backendWs.send(JSON.stringify({ type: 'transcribe' }));
}

function disconnectBackend() {
    if(backendWs) {
        backendWs.close();
        backendWs = null;
        isConnected = false;
    }
}

function isBackendConnected() {
    return isConnected;
}

function setSystemPrompt(prompt) {
    currentSystemPrompt = prompt;
    if(backendWs && isConnected) {
        console.log('[Backend] Setting system prompt...');
        backendWs.send(JSON.stringify({ type: 'set_config', systemPrompt: prompt }));
    }
}

module.exports = {
    connectToBackend,
    sendAudioToBackend,
    requestTranscription,
    disconnectBackend,
    isBackendConnected,
    setSystemPrompt,
};