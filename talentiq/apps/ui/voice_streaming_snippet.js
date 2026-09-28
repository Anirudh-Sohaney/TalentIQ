// -----------------------------------------------------------------------------
// Voice Filtering Integration Snippet
// Use this code to replace the current MediaRecorder logic in app.js
// -----------------------------------------------------------------------------

let audioContext;
let audioProcessor;
let audioWebSocket;
let eventSource;
let liveTranscriptText = "";

async function handleRecording() {
  const status = document.querySelector('[data-recording-status]');

  if (state.isRecording) {
    stopRecording(true);
    status.textContent = 'Recording complete. Save the transcript for later follow-up.';
    renderRecord();
    return;
  }

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Recording is not supported by this browser.');
    }

    // 1. Get Microphone Access
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const source = audioContext.createMediaStreamSource(recordingStream);
    
    // 2. Connect to the Python WebSocket endpoint
    audioWebSocket = new WebSocket('ws://localhost:8765/api/stream');
    
    // 3. Start the Python pipeline in "web" mode
    await fetch('http://localhost:8765/api/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ device_id: "web", record: false })
    });

    // 4. Extract raw PCM Float32 audio chunks and send them
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    audioProcessor.onaudioprocess = (e) => {
        if (audioWebSocket && audioWebSocket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0); // Float32Array
            audioWebSocket.send(inputData.buffer); 
        }
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);

    // 5. Listen for the live transcribed text!
    eventSource = new EventSource('http://localhost:8765/api/events');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
            liveTranscriptText += " " + data.text;
            console.log("Live Transcript:", liveTranscriptText);
            
            // --> FRONTEND AGENT NOTE <--
            // Update the UI here! The user requested to save the transcript into 
            // the newly created transcript screen. You can push `liveTranscriptText` 
            // to that new UI element.
        }
    };

    state.isRecording = toggleRecording(false);
    status.textContent = 'Recording started. Streaming to local AI model...';
    renderRecord();

  } catch (error) {
    status.textContent = 'Microphone access is required to start recording.';
    console.error(error);
  }
}

function stopRecording(save) {
  state.isRecording = toggleRecording(true);
  state.hasRecording = true;

  // Cleanup Web Audio & Sockets
  if (audioProcessor) audioProcessor.disconnect();
  if (audioContext) audioContext.close();
  if (audioWebSocket) audioWebSocket.close();
  if (eventSource) eventSource.close();
  if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
  
  // Stop the Python pipeline
  fetch('http://localhost:8765/api/stop', { method: 'POST' });
}
