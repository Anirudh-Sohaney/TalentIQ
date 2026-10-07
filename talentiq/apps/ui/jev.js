// Jev - Voice Assistant for TalentIQ
let audioContext;
let audioProcessor;
let audioWebSocket;
let eventSource;
let liveTranscriptText = "";
let recordingStream;
let isJevListening = false;

function setJevStatus(message, isError = false) {
  // Try to use the existing data status or create one
  const status = document.querySelector('[data-data-status]');
  if (status) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle('is-error', isError);
    if (!isError && message) {
      setTimeout(() => { status.hidden = true; }, 4000);
    }
  } else {
    console.log(`JEV STATUS: ${message}`);
  }
}

export async function startJevListening() {
  if (isJevListening) return;
  
  liveTranscriptText = "";
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Recording is not supported by this browser.');
    }

    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const source = audioContext.createMediaStreamSource(recordingStream);
    
    // Connect to local voice pipeline
    audioWebSocket = new WebSocket('ws://localhost:8765/api/stream');
    
    await fetch('http://localhost:8765/api/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ device_id: "web", record: false })
    });

    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    audioProcessor.onaudioprocess = (e) => {
        if (audioWebSocket && audioWebSocket.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            audioWebSocket.send(inputData.buffer); 
        }
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);

    eventSource = new EventSource('http://localhost:8765/api/events');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
            liveTranscriptText += " " + data.text;
        }
    };

    isJevListening = true;
    setJevStatus("🎤 Jev is listening...");

  } catch (error) {
    setJevStatus('Microphone access is required for Jev.', true);
    console.error(error);
  }
}

export async function stopJevListening(context = {}) {
  if (!isJevListening) return;
  isJevListening = false;
  
  if (audioProcessor) audioProcessor.disconnect();
  if (audioContext) audioContext.close();
  if (audioWebSocket) audioWebSocket.close();
  if (eventSource) eventSource.close();
  if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
  
  fetch('http://localhost:8765/api/stop', { method: 'POST' });
  
  if (!liveTranscriptText.trim()) {
     setJevStatus("Jev heard nothing.");
     return;
  }
  
  setJevStatus("⏳ Jev is processing...");
  
  try {
    const response = await fetch('/api/jev-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: liveTranscriptText,
        context: context
      })
    });
    
    if (!response.ok) throw new Error("Could not parse intent.");
    const intent = await response.json();
    
    if (intent.action === "UPDATE_STATUS") {
      // Dispatch a custom event to update status
      window.dispatchEvent(new CustomEvent('jev:updateStatus', {
        detail: {
           candidateId: intent.candidateId,
           status: intent.status // 'continue', 'waitlist', 'decline'
        }
      }));
      setJevStatus(`Jev updated status to ${intent.status}`);
    } else {
      setJevStatus("Jev didn't understand the command.", true);
    }
  } catch (error) {
    console.error(error);
    setJevStatus("Error processing Jev command.", true);
  }
}
