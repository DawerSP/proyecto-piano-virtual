// CONFIGURACIÓN DE NOTAS Y FRECUENCIAS (Escala C4 a C5)
const PIANO_NOTES = [
  { note: 'C4', freq: 261.63, label: 'Do' },
  { note: 'D4', freq: 293.66, label: 'Re' },
  { note: 'E4', freq: 329.63, label: 'Mi' },
  { note: 'F4', freq: 349.23, label: 'Fa' },
  { note: 'G4', freq: 392.00, label: 'Sol' },
  { note: 'A4', freq: 440.00, label: 'La' },
  { note: 'B4', freq: 493.88, label: 'Si' },
  { note: 'C5', freq: 523.25, label: 'Do+' }
];

// MELODÍA JINGLE BELLS (Secuencia de notas)
const JINGLE_BELLS = [
  'E4', 'E4', 'E4',
  'E4', 'E4', 'E4',
  'E4', 'G4', 'C4', 'D4', 'E4',
  'F4', 'F4', 'F4', 'F4',
  'F4', 'E4', 'E4', 'E4', 'E4',
  'D4', 'D4', 'E4', 'D4', 'G4'
];

// ESTADO GLOBAL DE LA APLICACIÓN
let audioCtx = null;
let mode = 'free'; // 'free' o 'learn'
let currentSongIndex = 0;
let keyStates = new Array(PIANO_NOTES.length).fill(false);
let keyCooldowns = new Array(PIANO_NOTES.length).fill(0);
let lastTouchedTimes = new Array(PIANO_NOTES.length).fill(0);

// ELEMENTOS DEL DOM
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const btnStart = document.getElementById('btn-start');
const btnModeFree = document.getElementById('btn-mode-free');
const btnModeLearn = document.getElementById('btn-mode-learn');
const learningPanel = document.getElementById('learning-panel');
const targetNoteDisplay = document.getElementById('target-note-display');
const songProgressDisplay = document.getElementById('song-progress');
const statusOverlay = document.getElementById('status-overlay');

// MOTOR DE AUDIO (Web Audio API)
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSynthesizedNote(freq) {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle'; // Onda triángular para un sonido suave y limpio
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  // Envolvente ADSR de volumen
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

// CONTROL DE MODOS DE JUEGO
btnModeFree.addEventListener('click', () => {
  mode = 'free';
  btnModeFree.classList.add('active');
  btnModeLearn.classList.remove('active');
  learningPanel.classList.add('hidden');
});

btnModeLearn.addEventListener('click', () => {
  mode = 'learn';
  currentSongIndex = 0;
  btnModeLearn.classList.add('active');
  btnModeFree.classList.remove('active');
  learningPanel.classList.remove('hidden');
  updateLearningUI();
});

function updateLearningUI() {
  if (currentSongIndex < JINGLE_BELLS.length) {
    targetNoteDisplay.innerText = JINGLE_BELLS[currentSongIndex];
    songProgressDisplay.innerText = `${currentSongIndex} / ${JINGLE_BELLS.length}`;
  } else {
    targetNoteDisplay.innerText = "¡Completado!";
    songProgressDisplay.innerText = `${JINGLE_BELLS.length} / ${JINGLE_BELLS.length}`;
  }
}

// DIBUJO DE TECLAS EN COORDENADAS NORMALES
function drawPianoKeys(width, height) {
  const numKeys = PIANO_NOTES.length;
  const keyWidth = width / numKeys;
  const keyHeight = height * 0.35; // Ocupa el 35% inferior de la pantalla
  const keyY = height - keyHeight;

  const keyBoxes = [];

  for (let i = 0; i < numKeys; i++) {
    const keyX = i * keyWidth;
    const isTarget = (mode === 'learn' && currentSongIndex < JINGLE_BELLS.length && JINGLE_BELLS[currentSongIndex] === PIANO_NOTES[i].note);
    const isPressed = keyStates[i];

    // Fondo de la tecla
    if (isPressed) {
      canvasCtx.fillStyle = '#ffcc00'; // Amarillo al presionar
    } else if (isTarget) {
      canvasCtx.fillStyle = 'rgba(46, 204, 113, 0.7)'; // Verde para la nota objetivo
    } else {
      canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // Blanco estándar
    }

    canvasCtx.fillRect(keyX + 2, keyY, keyWidth - 4, keyHeight - 4);

    // Borde de la tecla
    canvasCtx.lineWidth = isTarget ? 4 : 2;
    canvasCtx.strokeStyle = isTarget ? '#2ecc71' : '#333';
    canvasCtx.strokeRect(keyX + 2, keyY, keyWidth - 4, keyHeight - 4);

    // Texto de la nota
    canvasCtx.fillStyle = isPressed ? '#000' : '#222';
    canvasCtx.font = 'bold 20px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(PIANO_NOTES[i].note, keyX + keyWidth / 2, keyY + keyHeight - 40);
    
    canvasCtx.font = '14px Arial';
    canvasCtx.fillText(PIANO_NOTES[i].label, keyX + keyWidth / 2, keyY + keyHeight - 15);

    keyBoxes.push({
      xMin: keyX,
      xMax: keyX + keyWidth,
      yMin: keyY,
      yMax: height,
      note: PIANO_NOTES[i].note,
      freq: PIANO_NOTES[i].freq
    });
  }

  return keyBoxes;
}

// PROCESAMIENTO DE DETECCIÓN CON MEDIAPIPE
function onResults(results) {
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;

  const width = canvasElement.width;
  const height = canvasElement.height;

  // 1. DIBUJAR VÍDEO MODO ESPEJO
  canvasCtx.save();
  canvasCtx.translate(width, 0);
  canvasCtx.scale(-1, 1);
  canvasCtx.drawImage(results.image, 0, 0, width, height);
  canvasCtx.restore();

  // 2. DIBUJAR TECLAS DEL PIANO
  const keyBoxes = drawPianoKeys(width, height);

  const activeFingerPoints = [];

  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      // Puntas de dedos: Índice (8) y Medio (12)
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];

      [indexTip, middleTip].forEach((tip) => {
        const px = (1 - tip.x) * width;
        const py = tip.y * height;

        activeFingerPoints.push({ x: px, y: py });

        // Dibujar indicador en pantalla
        canvasCtx.beginPath();
        canvasCtx.arc(px, py, 12, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#00d2ff';
        canvasCtx.fill();
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = '#ffffff';
        canvasCtx.stroke();
      });
    }
  }

  // 3. DETECCIÓN DE COLISIONES CON HISTÉRESIS DE LIBERACIÓN Y ANTIRREBOTE
  const now = Date.now();

  keyBoxes.forEach((box, idx) => {
    let isTouched = false;

    activeFingerPoints.forEach((pt) => {
      if (pt.x >= box.xMin && pt.x <= box.xMax && pt.y >= box.yMin && pt.y <= box.yMax) {
        isTouched = true;
      }
    });

    if (isTouched) {
      lastTouchedTimes[idx] = now;

      // Si la tecla no estaba marcada como activa Y transcurrieron al menos 300ms desde el último disparo
      if (!keyStates[idx] && (now - keyCooldowns[idx] > 300)) {
        keyStates[idx] = true;
        keyCooldowns[idx] = now;
        playSynthesizedNote(box.freq);

        // Verificación en Modo Aprendizaje
        if (mode === 'learn' && currentSongIndex < JINGLE_BELLS.length) {
          if (box.note === JINGLE_BELLS[currentSongIndex]) {
            currentSongIndex++;
            updateLearningUI();
          }
        }
      }
    } else {
      // FILTRO DE LIBERACIÓN (Histéresis):
      // No libera la tecla inmediatamente ante micro-parpadeos de la IA.
      // Exige estar al menos 200ms continuos fuera de la tecla para marcarla libre.
      if (keyStates[idx] && (now - lastTouchedTimes[idx] > 200)) {
        keyStates[idx] = false;
      }
    }
  });
}

// INICIALIZACIÓN DE MEDIAPIPE Y CÁMARA
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

hands.onResults(onResults);

btnStart.addEventListener('click', async () => {
  initAudio();
  statusOverlay.innerText = "Cargando modelo de IA...";

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720
  });

  try {
    await camera.start();
    statusOverlay.style.display = 'none';
    btnStart.style.display = 'none';
  } catch (err) {
    statusOverlay.innerText = "Error al acceder a la cámara. Revisa los permisos.";
    console.error(err);
  }
});