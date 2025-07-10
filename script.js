let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let oscillator;
let targetFreq = 440;

function playRandomNote() {
  const baseFreq = parseFloat(document.getElementById('baseFreq').value);
  const edo = parseInt(document.getElementById('edo').value);
  const steps = Math.floor(Math.random() * edo);
  targetFreq = baseFreq * Math.pow(2, steps / edo);

  if (oscillator) oscillator.stop();
  oscillator = audioCtx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = targetFreq;
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 1);

  document.getElementById("noteInfo").innerText =
    `Target: ${targetFreq.toFixed(2)} Hz (${steps} steps above base)`;
}

let micStream, analyserNode, buffer, pitchDetector;

async function startListening() {
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioCtx.createMediaStreamSource(micStream);
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;
  buffer = new Float32Array(analyserNode.fftSize);
  source.connect(analyserNode);
  listen();
}

function listen() {
  analyserNode.getFloatTimeDomainData(buffer);
  const pitch = detectPitch(buffer, audioCtx.sampleRate);

  if (pitch) {
    const cents = 1200 * Math.log2(pitch / targetFreq);
    document.getElementById("pitchOutput").innerHTML =
      `Pitch: ${pitch.toFixed(2)} Hz<br>Cents Off: ${cents.toFixed(2)}`;
  } else {
    document.getElementById("pitchOutput").innerHTML =
      `Pitch: -- Hz<br>Cents Off: --`;
  }

  requestAnimationFrame(listen);
}

// Auto-correlation pitch detection
function detectPitch(buf, sampleRate) {
  let SIZE = buf.length;
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // too quiet

  for (let offset = 20; offset < 1000; offset++) {
    let correlation = 0;

    for (let i = 0; i < SIZE - offset; i++) {
      correlation += buf[i] * buf[i + offset];
    }

    correlation = correlation / (SIZE - offset);
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestCorrelation > 0.9) {
    return sampleRate / bestOffset;
  }
  return null;
}