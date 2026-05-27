/**
 * FelisID - Main Application Controller
 * Powered by TensorFlow.js & Teachable Machine Image Model
 */

(function () {
  'use strict';

  // 1. Configuration & Constants
  const MODEL_URL = "https://teachablemachine.withgoogle.com/models/UxPL-PvqA/";
  const LOCAL_STORAGE_KEY = "felisid_scan_history";
  
  // 2. Application State
  const state = {
    model: null,
    webcam: null,
    isWebcamActive: false,
    currentInputMode: "webcam", // "webcam" or "upload"
    isScanning: false,
    animationFrameId: null,
    isSoundEnabled: true,
    lastVerdict: "",
    isConfettiFired: false,
    colorAccent: "orange", // "orange", "purple", "emerald"
    history: [],
    uploadedImageElement: null
  };

  let lastPredictionTime = 0;
  const PREDICTION_INTERVAL = 150; // ms (approx 6.6 FPS) untuk mencegah CPU/GPU laptop overload

  // 3. Cat Encyclopedia Local Database
  const breedDatabase = [
    {
      id: "anggora",
      name: "Turkish Angora",
      type: "bulu-panjang",
      energy: 90,
      affection: 85,
      maintenance: 75,
      origin: "Turki",
      badge: "Bulu Indah",
      desc: "Anggora dikenal dengan bulunya yang selembut sutra, tubuh panjang ramping, dan telinga besar. Mereka sangat cerdas, suka bersosialisasi, aktif bermain, dan senang berada di tempat tinggi.",
      image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "persia",
      name: "Persia (Persian)",
      type: "bulu-panjang",
      energy: 35,
      affection: 90,
      maintenance: 90,
      origin: "Iran (Persia)",
      badge: "Sangat Manja",
      desc: "Kucing berwajah bulat dengan hidung pesek yang sangat ikonik. Memiliki kepribadian yang tenang, kalem, lembut, dan lebih memilih bersantai di sofa empuk daripada berlarian aktif.",
      image: "https://images.unsplash.com/photo-1614963326505-843867e2d330?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "bengal",
      name: "Bengal",
      type: "bulu-pendek",
      energy: 95,
      affection: 80,
      maintenance: 40,
      origin: "Amerika Serikat",
      badge: "Sangat Aktif",
      desc: "Memiliki corak bulu tutul eksotis seperti macan tutul liar (leopard). Kucing Bengal sangat cerdas, atletis, suka memanjat tinggi, menyukai air, dan membutuhkan banyak stimulasi permainan.",
      image: "https://images.unsplash.com/photo-1574158622643-69d34d72650a?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "maine-coon",
      name: "Maine Coon",
      type: "bulu-panjang",
      energy: 70,
      affection: 95,
      maintenance: 80,
      origin: "Amerika Serikat",
      badge: "Raksasa Lembut",
      desc: "Salah satu ras kucing domestik terbesar di dunia. Maine Coon berbadan besar gagah dengan cakar lebar dan ekor lebat seperti rubah, tetapi berhati lembut, ramah, dan sangat setia pada pemiliknya.",
      image: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "sphynx",
      name: "Sphynx",
      type: "bulu-pendek",
      energy: 85,
      affection: 98,
      maintenance: 85,
      origin: "Kanada",
      badge: "Unik & Hangat",
      desc: "Terkenal karena tidak memiliki bulu lebat (hanya lapisan rambut halus). Sphynx sangat aktif, suka mencari kehangatan, sangat manja, bersahabat, dan membutuhkan perawatan kulit berkala.",
      image: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "kampung",
      name: "Kucing Domestik (Kampung)",
      type: "bulu-pendek",
      energy: 80,
      affection: 75,
      maintenance: 20,
      origin: "Global / Indonesia",
      badge: "Tangguh & Cerdas",
      desc: "Kucing lokal Indonesia yang memiliki daya tahan tubuh luar biasa tinggi. Mereka mandiri, cerdas, pandai berburu, sangat aktif, mudah dirawat, dan setia jika diberikan kasih sayang tulus.",
      image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80"
    }
  ];

  // 4. DOM Elements
  const DOM = {
    loadingOverlay: document.getElementById("loading-overlay"),
    modelProgress: document.getElementById("model-progress"),
    loadingStatus: document.getElementById("loading-status"),
    
    // Nav & General Elements
    navLinks: document.querySelectorAll(".nav-link"),
    navShortcuts: document.querySelectorAll(".nav-shortcut"),
    mobileNavToggle: document.querySelector(".mobile-nav-toggle"),
    mainNav: document.querySelector(".main-nav"),
    appSections: document.querySelectorAll(".app-section"),
    logoLink: document.getElementById("logo-link"),
    historyBadge: document.getElementById("history-badge"),
    soundToggle: document.getElementById("sound-toggle"),
    neonToggle: document.getElementById("neon-toggle"),
    
    // Scanner Tab Elements
    tabWebcam: document.getElementById("tab-webcam"),
    tabUpload: document.getElementById("tab-upload"),
    viewportWebcam: document.getElementById("viewport-webcam"),
    viewportUpload: document.getElementById("viewport-upload"),
    scannerLaser: document.getElementById("scanner-laser"),
    
    // Webcam Elements
    webcamVideo: document.getElementById("webcam"),
    cameraSelectContainer: document.getElementById("camera-select-container"),
    cameraSelect: document.getElementById("camera-select"),
    btnStartWebcam: document.getElementById("btn-start-webcam"),
    btnStopWebcam: document.getElementById("btn-stop-webcam"),
    btnSnapPhoto: document.getElementById("btn-snap-photo"),
    webcamPlaceholder: document.querySelector(".webcam-placeholder"),
    webcamControls: document.getElementById("webcam-controls-container"),
    
    // Upload Elements
    dragDropZone: document.getElementById("drag-drop-zone"),
    fileInput: document.getElementById("file-input"),
    uploadPlaceholder: document.getElementById("upload-placeholder-content"),
    uploadPreviewContainer: document.getElementById("upload-preview-container"),
    imagePreview: document.getElementById("image-preview"),
    btnClearFile: document.getElementById("btn-clear-file"),
    btnScanUploaded: document.getElementById("btn-scan-uploaded"),
    uploadControls: document.getElementById("upload-controls-container"),
    
    // Results elements
    aiStatus: document.getElementById("ai-status"),
    verdictBanner: document.getElementById("verdict-banner"),
    verdictEmoji: document.getElementById("verdict-emoji"),
    verdictTitle: document.getElementById("verdict-title"),
    verdictDesc: document.getElementById("verdict-desc"),
    valKucing: document.getElementById("val-kucing"),
    barKucing: document.getElementById("bar-kucing"),
    valBukanKucing: document.getElementById("val-bukan-kucing"),
    barBukanKucing: document.getElementById("bar-bukan-kucing"),
    diagLatency: document.getElementById("diag-latency"),
    
    // Encyclopedia elements
    breedSearch: document.getElementById("breed-search"),
    filterTags: document.querySelectorAll(".filter-tag"),
    breedsGrid: document.getElementById("breeds-grid"),
    
    // History elements
    historyGrid: document.getElementById("history-grid"),
    historyEmpty: document.getElementById("history-empty"),
    historyCount: document.getElementById("history-count"),
    btnClearHistory: document.getElementById("btn-clear-history")
  };

  // 5. Sound Synthesizer (Web Audio API Meow)
  function playCuteMeow() {
    if (!state.isSoundEnabled) return;
    
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Meow Tone 1 (Soft body frequency pitch sliding up then down)
      const osc1 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // soft wave for cuteness
      osc1.type = 'triangle';
      
      const now = audioCtx.currentTime;
      
      // Pitch Slide (Me-ow)
      osc1.frequency.setValueAtTime(450, now); // start lower
      osc1.frequency.exponentialRampToValueAtTime(780, now + 0.08); // slide up fast for the "me"
      osc1.frequency.exponentialRampToValueAtTime(560, now + 0.35); // slide down slowly for the "ow"
      
      // Volume Envelope
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05); // quick fade in
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.38); // smooth fade out
      
      // Tone 2 (Harmonic chirp/purr)
      const osc2 = audioCtx.createOscillator();
      const gainNode2 = audioCtx.createGain();
      
      osc2.connect(gainNode2);
      gainNode2.connect(audioCtx.destination);
      osc2.type = 'sine';
      
      osc2.frequency.setValueAtTime(1400, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
      
      gainNode2.gain.setValueAtTime(0.001, now);
      gainNode2.gain.linearRampToValueAtTime(0.03, now + 0.05); // low volume chirp
      gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
      
      // clean up context
      setTimeout(() => {
        audioCtx.close();
      }, 500);
      
    } catch (e) {
      console.warn("Web Audio API not fully supported or blocked:", e);
    }
  }

  // 6. Init Model & Pre-loader
  async function initApplication() {
    try {
      // Step 1: Animate loading progress smoothly
      updateLoadingStatus("Mengunduh modul arsitektur MobileNet...", 20);
      
      // Step 2: Call TensorFlow setup
      await tf.ready();
      updateLoadingStatus("Mengompilasi shader WebGL...", 45);
      
      // Step 3: Load Teachable Machine model
      const checkpointURL = MODEL_URL + "model.json";
      const metadataURL = MODEL_URL + "metadata.json";
      
      state.model = await tmImage.load(checkpointURL, metadataURL);
      
      updateLoadingStatus("Mengoptimalkan struktur model...", 85);
      
      // Quick model warmup
      const dummyInput = document.createElement("canvas");
      dummyInput.width = 224;
      dummyInput.height = 224;
      await state.model.predict(dummyInput);
      
      updateLoadingStatus("FelisID AI Siap!", 100);
      
      // Fade out loading screen
      setTimeout(() => {
        DOM.loadingOverlay.classList.add("fade-out");
        // Load initial modules
        loadHistory();
        renderEncyclopedia(breedDatabase);
        lucide.createIcons();
      }, 600);

    } catch (err) {
      console.error("Gagal memuat model Teachable Machine:", err);
      DOM.loadingStatus.textContent = "Error: Hubungan internet lambat atau API diblokir. Segarkan halaman.";
      DOM.loadingStatus.style.color = "var(--status-danger)";
    }
  }

  function updateLoadingStatus(message, progressPercentage) {
    DOM.loadingStatus.textContent = message;
    DOM.modelProgress.style.width = `${progressPercentage}%`;
  }

  // 7. Navigation & SPA Page Controller
  function switchPage(targetId) {
    // Hide active section, show targeted one
    DOM.appSections.forEach(section => {
      section.classList.remove("active");
      if (section.id === targetId) {
        section.classList.add("active");
      }
    });

    // Update active state in nav link
    DOM.navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("data-target") === targetId) {
        link.classList.add("active");
      }
    });

    // Handle Webcam resource allocation when switching away from scanner
    if (targetId !== "scanner" && state.isWebcamActive) {
      stopWebcam();
    }

    // Collapse mobile nav if expanded
    DOM.mainNav.classList.remove("active");

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Helper untuk membaca kamera yang tersedia dan mengisi dropdown UI
  async function populateCameraSelector() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      DOM.cameraSelect.innerHTML = "";
      
      if (videoDevices.length === 0) {
        DOM.cameraSelectContainer.style.display = "none";
        return null;
      }
      
      // Tampilkan kontainer pilihan kamera
      DOM.cameraSelectContainer.style.display = "flex";
      
      // Isi elemen select dengan daftar kamera
      videoDevices.forEach(d => {
        const option = document.createElement("option");
        option.value = d.deviceId;
        option.textContent = d.label || `Kamera ${DOM.cameraSelect.children.length + 1}`;
        DOM.cameraSelect.appendChild(option);
      });
      
      // Cari kamera fisik bawaan laptop (integrated, built-in, front, HD camera, dll)
      let bestDevice = videoDevices.find(d => {
        const label = d.label.toLowerCase();
        return (label.includes('integrated') || label.includes('built-in') || label.includes('front') || label.includes('internal') || label.includes('hd') || label.includes('usb') || label.includes('camera') || label.includes('webcam')) && 
               !label.includes('obs') && !label.includes('virtual');
      });
      
      // Jika tidak ada kata kunci di atas, pilih kamera apa saja yang bukan OBS
      if (!bestDevice) {
        bestDevice = videoDevices.find(d => {
          const label = d.label.toLowerCase();
          return !label.includes('obs') && !label.includes('virtual');
        });
      }
      
      // Fallback ke kamera pertama jika tidak ada pilihan lain
      if (!bestDevice) {
        bestDevice = videoDevices[0];
      }
      
      if (bestDevice) {
        DOM.cameraSelect.value = bestDevice.deviceId;
        console.log("Otomatis menyetel pilihan default kamera ke:", bestDevice.label);
      }
      
      return bestDevice ? bestDevice.deviceId : null;
    } catch (e) {
      console.warn("Gagal mengisi dropdown kamera:", e);
      return null;
    }
  }

  // 8. Webcam Management
  async function startWebcam() {
    if (state.isWebcamActive) return;

    DOM.aiStatus.textContent = "Menghubungkan Kamera...";
    DOM.aiStatus.classList.add("scanning");

    try {
      // Minta izin kamera pertama kali agar label nama kamera terbaca
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Matikan stream sementara segera setelah izin didapatkan
      tempStream.getTracks().forEach(track => track.stop());

      // Pindai kamera dan isi dropdown select
      const bestDeviceId = await populateCameraSelector();
      
      const size = 400;
      const flip = true; // mirror mode
      
      state.webcam = new tmImage.Webcam(size, size, flip);
      
      // Ambil deviceId terpilih dari dropdown UI
      const selectedDeviceId = DOM.cameraSelect.value || bestDeviceId;
      const setupOptions = selectedDeviceId ? { deviceId: selectedDeviceId } : {};
      
      await state.webcam.setup(setupOptions); // request camera access dengan kamera terpilih
      await state.webcam.play();
      
      // Replace placeholder with active webcam element
      DOM.webcamVideo.style.display = "block";
      DOM.webcamPlaceholder.style.display = "none";
      DOM.webcamControls.style.display = "flex";
      
      // Teachable Machine handles the canvas/video rendering
      // Append TM webcam canvas inside video container or map to video element
      DOM.webcamVideo.srcObject = state.webcam.webcam.srcObject;
      
      state.isWebcamActive = true;
      state.isScanning = true;
      DOM.scannerLaser.classList.add("animating");
      
      DOM.aiStatus.textContent = "Kamera Aktif & Memindai";
      
      // Start loop
      loopWebcamScan();

    } catch (err) {
      console.error("Gagal mengaktifkan Webcam:", err);
      alert("Akses kamera ditolak atau tidak ditemukan. Silakan izinkan akses kamera di browser Anda atau gunakan tab 'Unggah Gambar'.");
      DOM.aiStatus.textContent = "Kamera Tidak Terhubung";
      DOM.aiStatus.classList.remove("scanning");
      stopWebcam();
    }
  }

  function stopWebcam() {
    state.isScanning = false;
    DOM.scannerLaser.classList.remove("animating");
    
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
    
    if (state.webcam) {
      state.webcam.stop();
      state.webcam = null;
    }
    
    DOM.webcamVideo.srcObject = null;
    DOM.webcamVideo.style.display = "none";
    DOM.webcamPlaceholder.style.display = "flex";
    DOM.webcamControls.style.display = "none";
    
    state.isWebcamActive = false;
    DOM.aiStatus.textContent = "Kamera Nonaktif";
    DOM.aiStatus.classList.remove("scanning");
  }

  async function loopWebcamScan() {
    if (!state.isScanning || !state.isWebcamActive) return;
    
    try {
      // Update camera frame secara aman
      if (state.webcam) {
        state.webcam.update();
        
        const now = performance.now();
        if (now - lastPredictionTime >= PREDICTION_INTERVAL) {
          lastPredictionTime = now;
          // Jalankan prediksi secara asinkron
          await predictInput(state.webcam.canvas);
        }
      }
    } catch (err) {
      console.error("Error pada loop pemindaian webcam:", err);
    }
    
    // Selalu jadwalkan frame berikutnya agar kamera tidak membeku (freeze)
    state.animationFrameId = requestAnimationFrame(loopWebcamScan);
  }

  // 9. Prediction & Classification Engine
  async function predictInput(inputElement) {
    if (!state.model) return;

    const startTime = performance.now();
    
    // TM Model prediction
    const predictions = await state.model.predict(inputElement);
    
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    DOM.diagLatency.textContent = `~${latency}ms`;

    // Map predictions array to friendly object
    // predictions: [{ className: "Kucing", probability: 0.95 }, { className: "Bukan Kucing", probability: 0.05 }]
    let pKucing = 0;
    let pBukanKucing = 0;

    predictions.forEach(p => {
      if (p.className === "Kucing") {
        pKucing = p.probability;
      } else if (p.className === "Bukan Kucing") {
        pBukanKucing = p.probability;
      }
    });

    // Convert to percentage
    const pctKucing = Math.round(pKucing * 100);
    const pctBukanKucing = Math.round(pBukanKucing * 100);

    // Update UI Metrics
    DOM.valKucing.textContent = `${pctKucing}%`;
    DOM.barKucing.style.width = `${pctKucing}%`;
    
    DOM.valBukanKucing.textContent = `${pctBukanKucing}%`;
    DOM.barBukanKucing.style.width = `${pctBukanKucing}%`;

    // Process Verdict Banner
    processVerdict(pctKucing, pctBukanKucing, inputElement);
  }

  function processVerdict(pctKucing, pctBukanKucing, inputElement) {
    let currentVerdict = "neutral";
    
    if (pctKucing > pctBukanKucing && pctKucing >= 65) {
      currentVerdict = "kucing";
    } else if (pctBukanKucing > pctKucing && pctBukanKucing >= 65) {
      currentVerdict = "bukan-kucing";
    }

    // React to changes in verdict to avoid visual/audio spam
    if (currentVerdict !== state.lastVerdict) {
      state.lastVerdict = currentVerdict;
      
      if (currentVerdict === "kucing") {
        // AI detected a Cat!
        DOM.verdictBanner.className = "verdict-banner cat-detected";
        DOM.verdictEmoji.textContent = "🐱";
        DOM.verdictTitle.textContent = "Kucing Terdeteksi! 🐾";
        DOM.verdictDesc.textContent = `AI kami mendeteksi kehadiran kucing dengan keyakinan ${pctKucing}%. Silakan cek Ensiklopedia untuk membaca info ras kucing menarik!`;
        
        // Trigger sounds and celebrations!
        playCuteMeow();
        
        if (!state.isConfettiFired) {
          triggerConfettiCelebration();
          state.isConfettiFired = true;
          
          // Save this to local history log (throttle so we don't spam webcam frame captures)
          saveScanToHistory("Kucing", pctKucing, inputElement);
        }

      } else if (currentVerdict === "bukan-kucing") {
        // AI detected Not a Cat
        DOM.verdictBanner.className = "verdict-banner not-cat";
        DOM.verdictEmoji.textContent = "🚫";
        DOM.verdictTitle.textContent = "Bukan Kucing";
        DOM.verdictDesc.textContent = `Objek diklasifikasikan sebagai 'Bukan Kucing' dengan skor keyakinan ${pctBukanKucing}%. Cobalah memindai gambar kucing lain!`;
        
        state.isConfettiFired = false; // Reset
        
        // Save scan history for unique items (avoid too many history items in webcam mode)
        if (state.currentInputMode === "upload") {
          saveScanToHistory("Bukan Kucing", pctBukanKucing, inputElement);
        }

      } else {
        // Neutral/Low confidence
        DOM.verdictBanner.className = "verdict-banner neutral";
        DOM.verdictEmoji.textContent = "🔍";
        DOM.verdictTitle.textContent = "Menganalisis Objek...";
        DOM.verdictDesc.textContent = "Menunggu model memproses data piksel secara optimal. Pastikan pencahayaan cukup.";
        state.isConfettiFired = false;
      }
    }
  }

  function triggerConfettiCelebration() {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [state.colorAccent === 'purple' ? '#a855f7' : state.colorAccent === 'emerald' ? '#10b981' : '#ff7b00', '#ffae00', '#ec4899', '#3b82f6']
      });
    } catch(e) {
      console.log("Confetti failure: ", e);
    }
  }

  // 10. Manual Upload Manager
  function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert("Harap pilih berkas gambar yang valid (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    
    // Show uploading/processing effects
    DOM.aiStatus.textContent = "Memproses Berkas...";
    DOM.aiStatus.classList.add("scanning");
    
    reader.onload = function (e) {
      // Reset state for new capture
      state.isConfettiFired = false;
      state.lastVerdict = "";

      // Load preview image
      DOM.imagePreview.src = e.target.result;
      DOM.uploadPlaceholder.style.display = "none";
      DOM.uploadPreviewContainer.style.display = "flex";
      DOM.btnScanUploaded.removeAttribute("disabled");
      
      // Store in state to run prediction later
      const img = new Image();
      img.src = e.target.result;
      img.onload = async function() {
        state.uploadedImageElement = img;
        DOM.aiStatus.textContent = "Gambar Siap Di-Scan";
        
        // Auto trigger scan on load for premium speed feel!
        DOM.scannerLaser.classList.add("animating");
        await predictInput(img);
        DOM.scannerLaser.classList.remove("animating");
        DOM.aiStatus.textContent = "Analisis Selesai";
        DOM.aiStatus.classList.remove("scanning");
      };
    };

    reader.readAsDataURL(file);
  }

  // Helper to scale canvas for lightweight thumbnails
  function getThumbnailDataURL(sourceElement, width = 120, height = 120) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext("2d");
    
    if (sourceElement.tagName === "VIDEO") {
      // Handle webcam video mirror drawing
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sourceElement, 0, 0, width, height);
    } else {
      ctx.drawImage(sourceElement, 0, 0, width, height);
    }
    
    return tempCanvas.toDataURL("image/jpeg", 0.6); // high compression for speed
  }

  // 11. History Management (localStorage log)
  function saveScanToHistory(label, score, sourceElement) {
    let thumbnail = "";
    
    try {
      if (sourceElement instanceof HTMLVideoElement || sourceElement instanceof HTMLCanvasElement || sourceElement instanceof HTMLImageElement) {
        thumbnail = getThumbnailDataURL(sourceElement, 150, 150);
      }
    } catch(e) {
      console.warn("Failed drawing thumbnail for history:", e);
      thumbnail = "placeholder"; // fallback
    }

    const newScan = {
      id: Date.now().toString(),
      label: label,
      score: score,
      thumbnail: thumbnail,
      timestamp: new Date().toISOString()
    };

    state.history.unshift(newScan); // add to top
    
    // Cap history size to 30 elements to protect localStorage quota
    if (state.history.length > 30) {
      state.history.pop();
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.history));
    updateHistoryUI();
  }

  function loadHistory() {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        state.history = JSON.parse(raw);
      } catch(e) {
        state.history = [];
      }
    }
    updateHistoryUI();
  }

  function updateHistoryUI() {
    const len = state.history.length;
    DOM.historyBadge.textContent = len;
    DOM.historyCount.textContent = len;

    if (len === 0) {
      DOM.historyEmpty.style.display = "flex";
      DOM.historyGrid.style.display = "none";
      DOM.historyGrid.innerHTML = "";
    } else {
      DOM.historyEmpty.style.display = "none";
      DOM.historyGrid.style.display = "grid";
      
      DOM.historyGrid.innerHTML = state.history.map(item => {
        const dateStr = formatRelativeTime(new Date(item.timestamp));
        const badgeClass = item.label === "Kucing" ? "kucing" : "bukan-kucing";
        const titleText = item.label === "Kucing" ? "Kucing 🐱" : "Bukan Kucing 🚫";
        const thumbUrl = item.thumbnail === "placeholder" ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=50" : item.thumbnail;

        return `
          <div class="glass-panel history-item-card" data-id="${item.id}">
            <button class="btn-delete-item" onclick="window.deleteHistoryItem('${item.id}')" title="Hapus Riwayat">
              <i data-lucide="trash"></i>
            </button>
            <img src="${thumbUrl}" alt="${item.label}">
            <div class="history-item-content">
              <div class="history-item-verdict">
                <span class="verdict-tag ${badgeClass}">${titleText}</span>
                <span class="history-item-score">${item.score}%</span>
              </div>
              <span class="history-item-date">${dateStr}</span>
            </div>
          </div>
        `;
      }).join("");

      lucide.createIcons();
    }
  }

  // Handle individual delete
  window.deleteHistoryItem = function (itemId) {
    state.history = state.history.filter(item => item.id !== itemId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.history));
    updateHistoryUI();
  };

  function clearAllHistory() {
    if (confirm("Apakah Anda yakin ingin menghapus semua riwayat pemindaian?")) {
      state.history = [];
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      updateHistoryUI();
    }
  }

  // Relatve time formatter
  function formatRelativeTime(date) {
    const diffMs = new Date() - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);

    if (diffSec < 60) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    if (diffHrs < 24) return `${diffHrs} jam yang lalu`;
    
    // standard date representation
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // 12. Encyclopedia Render & Filter Engine
  function renderEncyclopedia(data) {
    if (data.length === 0) {
      DOM.breedsGrid.innerHTML = `
        <div class="glass-panel" style="grid-column: 1/-1; padding: 3rem; text-align: center;">
          <h3 style="margin-bottom: 0.5rem;">Tidak Ada Hasil Ditemukan</h3>
          <p>Cobalah kata kunci pencarian yang lain.</p>
        </div>
      `;
      return;
    }

    DOM.breedsGrid.innerHTML = data.map(breed => {
      const typeLabel = breed.type === "bulu-panjang" ? "Bulu Panjang" : "Bulu Pendek";
      
      return `
        <div class="glass-panel breed-card">
          <div class="breed-image-wrapper">
            <div class="breed-tags">
              <span class="breed-badge">${typeLabel}</span>
              <span class="breed-badge highlight-tag">${breed.badge}</span>
            </div>
            <img src="${breed.image}" alt="${breed.name}">
          </div>
          <div class="breed-info-panel">
            <h3>${breed.name}</h3>
            <p class="breed-desc">${breed.desc}</p>
            
            <div class="breed-stats">
              <!-- Energy Stat -->
              <div class="stat-bar-group">
                <div class="stat-label-row">
                  <span>Keaktifan / Energi:</span>
                  <span>${breed.energy}%</span>
                </div>
                <div class="stat-track">
                  <div class="stat-fill" style="width: ${breed.energy}%"></div>
                </div>
              </div>

              <!-- Affection Stat -->
              <div class="stat-bar-group">
                <div class="stat-label-row">
                  <span>Kemanjaan / Kasih Sayang:</span>
                  <span>${breed.affection}%</span>
                </div>
                <div class="stat-track">
                  <div class="stat-fill" style="width: ${breed.affection}%"></div>
                </div>
              </div>

              <!-- Maintenance Stat -->
              <div class="stat-bar-group">
                <div class="stat-label-row">
                  <span>Perawatan Bulu:</span>
                  <span>${breed.maintenance}%</span>
                </div>
                <div class="stat-track">
                  <div class="stat-fill" style="width: ${breed.maintenance}%"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      `;
    }).join("");
  }

  function filterEncyclopedia() {
    const query = DOM.breedSearch.value.toLowerCase().trim();
    const activeFilterTag = document.querySelector(".filter-tag.active");
    const category = activeFilterTag ? activeFilterTag.getAttribute("data-filter") : "all";

    const filtered = breedDatabase.filter(breed => {
      const matchesSearch = breed.name.toLowerCase().includes(query) || 
                            breed.desc.toLowerCase().includes(query) ||
                            breed.origin.toLowerCase().includes(query);
      
      let matchesCategory = true;
      if (category === "bulu-panjang") {
        matchesCategory = breed.type === "bulu-panjang";
      } else if (category === "bulu-pendek") {
        matchesCategory = breed.type === "bulu-pendek";
      } else if (category === "aktif") {
        matchesCategory = breed.energy >= 80;
      }

      return matchesSearch && matchesCategory;
    });

    renderEncyclopedia(filtered);
  }

  // 13. Theme & Accent Manager
  function rotateColorAccent() {
    const body = document.body;
    const dot = DOM.neonToggle.querySelector(".neon-dot");
    
    if (state.colorAccent === "orange") {
      body.classList.remove("neon-emerald");
      body.classList.add("neon-purple");
      state.colorAccent = "purple";
      dot.style.backgroundColor = "var(--accent-primary)";
      dot.style.boxShadow = "var(--glow-accent)";
      
    } else if (state.colorAccent === "purple") {
      body.classList.remove("neon-purple");
      body.classList.add("neon-emerald");
      state.colorAccent = "emerald";
      dot.style.backgroundColor = "var(--accent-primary)";
      dot.style.boxShadow = "var(--glow-accent)";
      
    } else {
      body.classList.remove("neon-emerald");
      state.colorAccent = "orange";
      dot.style.backgroundColor = "var(--accent-primary)";
      dot.style.boxShadow = "var(--glow-accent)";
    }
  }

  // 14. Add Event Listeners
  function registerEventListeners() {
    
    // Page switching
    DOM.navLinks.forEach(link => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = this.getAttribute("data-target");
        switchPage(target);
      });
    });

    DOM.navShortcuts.forEach(link => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = this.getAttribute("data-target");
        switchPage(target);
      });
    });

    DOM.logoLink.addEventListener("click", function(e) {
      e.preventDefault();
      switchPage("scanner");
    });

    // Mobile Navbar toggle
    DOM.mobileNavToggle.addEventListener("click", () => {
      DOM.mainNav.classList.toggle("active");
    });

    // Tab control scanner mode
    DOM.tabWebcam.addEventListener("click", () => {
      if (state.currentInputMode === "webcam") return;
      state.currentInputMode = "webcam";
      DOM.tabWebcam.classList.add("active");
      DOM.tabUpload.classList.remove("active");
      DOM.viewportWebcam.classList.add("active");
      DOM.viewportUpload.classList.remove("active");
      DOM.uploadControls.style.display = "none";
      
      // Stop scanning upload, restore webcam if needed
      if (state.isWebcamActive) {
        startWebcam();
      }
    });

    DOM.tabUpload.addEventListener("click", () => {
      if (state.currentInputMode === "upload") return;
      state.currentInputMode = "upload";
      DOM.tabWebcam.classList.remove("active");
      DOM.tabUpload.classList.add("active");
      DOM.viewportWebcam.classList.remove("active");
      DOM.viewportUpload.classList.add("active");
      DOM.uploadControls.style.display = "flex";
      
      // Stop webcam stream when uploading
      if (state.isWebcamActive) {
        stopWebcam();
        // keep active flag true so when toggling back it will restart automatically
        state.isWebcamActive = true; 
      }
    });

    // Webcam control buttons
    DOM.btnStartWebcam.addEventListener("click", startWebcam);
    DOM.btnStopWebcam.addEventListener("click", stopWebcam);
    
    DOM.btnSnapPhoto.addEventListener("click", async () => {
      // Freeze scanner animation for cool snapshot visual cue
      DOM.scannerLaser.classList.remove("animating");
      playCuteMeow();
      
      setTimeout(() => {
        if (state.isWebcamActive) {
          DOM.scannerLaser.classList.add("animating");
        }
      }, 500);

      // Webcams are scanned automatically in real-time, but manual tap fires a full capture event
      if (state.webcam) {
        await predictInput(state.webcam.canvas);
        triggerConfettiCelebration();
      }
    });

    // Event listener untuk perubahan pilihan kamera
    DOM.cameraSelect.addEventListener("change", async function() {
      if (state.isWebcamActive) {
        stopWebcam();
        state.isWebcamActive = false;
        await startWebcam();
      }
    });

    // Upload zone interactions
    DOM.dragDropZone.addEventListener("click", () => {
      DOM.fileInput.click();
    });

    DOM.fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
      }
    });

    DOM.dragDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      DOM.dragDropZone.classList.add("highlight-drop");
    });

    DOM.dragDropZone.addEventListener("dragleave", () => {
      DOM.dragDropZone.classList.remove("highlight-drop");
    });

    DOM.dragDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      DOM.dragDropZone.classList.remove("highlight-drop");
      if (e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    });

    DOM.btnClearFile.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent opening file dialog
      DOM.fileInput.value = "";
      DOM.uploadPlaceholder.style.display = "flex";
      DOM.uploadPreviewContainer.style.display = "none";
      DOM.btnScanUploaded.setAttribute("disabled", "true");
      state.uploadedImageElement = null;
      state.lastVerdict = "";
      
      // Reset confidence scores
      DOM.valKucing.textContent = "0%";
      DOM.barKucing.style.width = "0%";
      DOM.valBukanKucing.textContent = "0%";
      DOM.barBukanKucing.style.width = "0%";
      
      DOM.verdictBanner.className = "verdict-banner neutral";
      DOM.verdictEmoji.textContent = "🔍";
      DOM.verdictTitle.textContent = "Menunggu Data Input";
      DOM.verdictDesc.textContent = "Silakan nyalakan kamera live atau unggah gambar untuk memulai pemindaian.";
    });

    DOM.btnScanUploaded.addEventListener("click", async () => {
      if (state.uploadedImageElement) {
        DOM.scannerLaser.classList.add("animating");
        DOM.aiStatus.textContent = "Menganalisis...";
        DOM.aiStatus.classList.add("scanning");
        
        await predictInput(state.uploadedImageElement);
        
        DOM.scannerLaser.classList.remove("animating");
        DOM.aiStatus.textContent = "Analisis Selesai";
        DOM.aiStatus.classList.remove("scanning");
      }
    });

    // Sound toggle button
    DOM.soundToggle.addEventListener("click", () => {
      state.isSoundEnabled = !state.isSoundEnabled;
      if (state.isSoundEnabled) {
        DOM.soundToggle.classList.add("active");
        DOM.soundToggle.querySelector("i").setAttribute("data-lucide", "volume-2");
        playCuteMeow();
      } else {
        DOM.soundToggle.classList.remove("active");
        DOM.soundToggle.querySelector("i").setAttribute("data-lucide", "volume-x");
      }
      lucide.createIcons();
    });

    // Neon Accent Swap
    DOM.neonToggle.addEventListener("click", rotateColorAccent);

    // History controls
    DOM.btnClearHistory.addEventListener("click", clearAllHistory);

    // Search and filter in encyclopedia
    DOM.breedSearch.addEventListener("input", filterEncyclopedia);

    DOM.filterTags.forEach(tag => {
      tag.addEventListener("click", function () {
        DOM.filterTags.forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        filterEncyclopedia();
      });
    });

  }

  // 15. Execution Entry Point
  document.addEventListener("DOMContentLoaded", () => {
    // Initial UI States
    DOM.soundToggle.classList.add("active");
    
    // Warm up/bind events
    registerEventListeners();
    
    // Download TensorFlow weights and initialize
    initApplication();
  });

})();
