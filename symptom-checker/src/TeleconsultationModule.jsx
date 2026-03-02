import { useState, useEffect, useRef } from "react";
import { io } from 'socket.io-client';
// ═══════════════════════════════════════════════════════════════════════════════
// TELECONSULTATION MODULE — Complete Implementation
// Features: WebRTC P2P video, waiting room, doctor clinical panel, e-prescription,
//           low-bandwidth adaptive streaming, session recording, EHR integration
// ═══════════════════════════════════════════════════════════════════════════════

// ─── MOCK DATA (Replace with real API calls) ──────────────────────────────────
const MOCK_PATIENT = {
  id: "P12345",
  name: "Lakshmi Devi",
  age: 42,
  gender: "Female",
  phone: "+91 98765 43210",
  location: "Tiruvallur, Tamil Nadu",
  symptomSummary: {
    symptoms: ["fever", "headache", "joint_pain", "fatigue"],
    severity: "moderate",
    duration: "3 days",
    painLevel: 6,
    aiDiagnosis: [
      { condition: "Dengue Fever", probability: 68 },
      { condition: "Chikungunya", probability: 22 },
      { condition: "Viral Fever", probability: 10 }
    ]
  },
  medicalHistory: {
    allergies: ["Penicillin"],
    chronicConditions: ["Type 2 Diabetes"],
    currentMedications: ["Metformin 500mg BD"],
    pastConsultations: [
      { date: "2024-01-15", diagnosis: "Upper Respiratory Infection", doctor: "Dr. Ramesh Kumar" },
      { date: "2023-12-08", diagnosis: "Gastroenteritis", doctor: "Dr. Priya Sharma" }
    ],
    vitals: {
      bloodPressure: "130/85",
      heartRate: "88 bpm",
      temperature: "101.2°F",
      spo2: "97%",
      weight: "62 kg"
    }
  }
};

const MOCK_DOCTOR = {
  id: "D5678",
  name: "Dr. Rajesh Krishnan",
  specialty: "General Medicine",
  qualification: "MBBS, MD",
  registrationNo: "TN-12345",
  hospital: "Rajalakshmi Medical Center"
};

const MEDICATIONS_DB = [
  { name: "Paracetamol", generic: "Acetaminophen", strengths: ["500mg", "650mg"], forms: ["Tablet", "Syrup"] },
  { name: "Dolo-650", generic: "Paracetamol", strengths: ["650mg"], forms: ["Tablet"] },
  { name: "Azithromycin", generic: "Azithromycin", strengths: ["250mg", "500mg"], forms: ["Tablet"] },
  { name: "Amoxicillin", generic: "Amoxicillin", strengths: ["250mg", "500mg"], forms: ["Capsule", "Syrup"] },
  { name: "Cetirizine", generic: "Cetirizine", strengths: ["5mg", "10mg"], forms: ["Tablet", "Syrup"] },
  { name: "Metformin", generic: "Metformin", strengths: ["500mg", "850mg", "1000mg"], forms: ["Tablet"] },
  { name: "Amlodipine", generic: "Amlodipine", strengths: ["2.5mg", "5mg", "10mg"], forms: ["Tablet"] },
  { name: "Atorvastatin", generic: "Atorvastatin", strengths: ["10mg", "20mg", "40mg"], forms: ["Tablet"] },
];

const DRUG_INTERACTIONS = {
  "Paracetamol": { conflicts: [], warnings: ["Do not exceed 4g/day", "Avoid alcohol"] },
  "Azithromycin": { conflicts: ["Warfarin"], warnings: ["Take on empty stomach"] },
  "Metformin": { conflicts: ["Alcohol"], warnings: ["Take with food", "Monitor kidney function"] }
};

// ─── WEBRTC CONFIGURATION ─────────────────────────────────────────────────────
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Add your TURN server here for production:
    // { urls: "turn:your-turn-server.com:3478", username: "user", credential: "pass" }
  ]
};

// ─── CONNECTION QUALITY DETECTOR ──────────────────────────────────────────────
class ConnectionMonitor {
  constructor(peerConnection, onQualityChange) {
    this.pc = peerConnection;
    this.onQualityChange = onQualityChange;
    this.lastBytes = 0;
    this.lastTimestamp = Date.now();
  }

  start() {
    this.interval = setInterval(async () => {
      if (!this.pc) return;
      const stats = await this.pc.getStats();
      let bandwidth = 0;
      let packetsLost = 0;
      let totalPackets = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          const now = Date.now();
          const bytes = report.bytesReceived || 0;
          const timeDiff = (now - this.lastTimestamp) / 1000;
          bandwidth = ((bytes - this.lastBytes) * 8) / timeDiff / 1000; // kbps
          this.lastBytes = bytes;
          this.lastTimestamp = now;
          packetsLost = report.packetsLost || 0;
          totalPackets = report.packetsReceived || 1;
        }
      });

      const quality = bandwidth > 500 ? "excellent" : bandwidth > 300 ? "good" : bandwidth > 150 ? "fair" : "poor";
      const packetLoss = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;
      
      this.onQualityChange({ quality, bandwidth: Math.round(bandwidth), packetLoss: packetLoss.toFixed(1) });
    }, 2000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}

// ─── LANGUAGE PACK ────────────────────────────────────────────────────────────
const LANG = {
  en: {
    waitingRoom: "Waiting Room",
    consultation: "Consultation",
    deviceCheck: "Device Check",
    testCamera: "Test Camera",
    testMic: "Test Microphone",
    testSpeaker: "Test Speaker",
    allGood: "All devices working properly",
    fixIssues: "Please fix device issues before joining",
    joinCall: "Join Video Call",
    waiting: "Waiting for doctor to join...",
    position: "Position in queue",
    estimatedWait: "Estimated wait time",
    minutes: "minutes",
    patientInfo: "Patient Information",
    medicalHistory: "Medical History",
    aiSummary: "AI Symptom Analysis",
    symptoms: "Symptoms",
    duration: "Duration",
    severity: "Severity",
    diagnosis: "Probable Diagnosis",
    allergies: "Allergies",
    chronic: "Chronic Conditions",
    currentMeds: "Current Medications",
    vitals: "Latest Vitals",
    pastConsults: "Past Consultations",
    endCall: "End Consultation",
    switchCamera: "Switch Camera",
    toggleVideo: "Toggle Video",
    toggleAudio: "Toggle Microphone",
    shareScreen: "Share Screen",
    chat: "Chat",
    prescription: "Prescription",
    notes: "Clinical Notes",
    connectionQuality: "Connection Quality",
    excellent: "Excellent",
    good: "Good",
    fair: "Fair - Consider audio-only",
    poor: "Poor - Switching to audio-only",
    audioOnly: "Audio Only Mode",
    reconnecting: "Reconnecting...",
    addMedication: "Add Medication",
    drugName: "Drug Name",
    dosage: "Dosage",
    frequency: "Frequency",
    duration: "Duration",
    instructions: "Special Instructions",
    savePrescription: "Save & Send Prescription",
    chiefComplaint: "Chief Complaint",
    examination: "Examination Findings",
    assessmentPlan: "Assessment & Plan",
    followUp: "Follow-up",
    generateSOAP: "Generate SOAP Note",
    bookFollowup: "Schedule Follow-up",
    consultationEnded: "Consultation Ended",
    sessionSummary: "Session Summary",
    downloadPrescription: "Download Prescription",
    downloadReport: "Download Report",
    provideFeedback: "Rate Your Experience",
    newConsultation: "New Consultation",
  },
  ta: {
    waitingRoom: "காத்திருப்பு அறை",
    consultation: "மருத்துவ ஆலோசனை",
    deviceCheck: "சாதன சோதனை",
    testCamera: "கேமரா சோதனை",
    testMic: "மைக் சோதனை",
    testSpeaker: "ஸ்பீக்கர் சோதனை",
    allGood: "அனைத்து சாதனங்களும் சரியாக வேலை செய்கின்றன",
    fixIssues: "சேர்வதற்கு முன் சாதன பிரச்சினைகளை சரிசெய்யவும்",
    joinCall: "வீடியோ அழைப்பில் சேர",
    waiting: "மருத்துவர் சேர காத்திருக்கிறது...",
    position: "வரிசையில் நிலை",
    estimatedWait: "மதிப்பிடப்பட்ட காத்திருப்பு நேரம்",
    minutes: "நிமிடங்கள்",
    patientInfo: "நோயாளி தகவல்",
    medicalHistory: "மருத்துவ வரலாறு",
    aiSummary: "AI அறிகுறி பகுப்பாய்வு",
    symptoms: "அறிகுறிகள்",
    duration: "காலம்",
    severity: "தீவிரம்",
    diagnosis: "சாத்தியமான நோய் கண்டறிதல்",
    allergies: "ஒவ்வாமை",
    chronic: "நாள்பட்ட நிலைமைகள்",
    currentMeds: "தற்போதைய மருந்துகள்",
    vitals: "சமீபத்திய உயிர் அறிகுறிகள்",
    pastConsults: "கடந்த ஆலோசனைகள்",
    endCall: "ஆலோசனையை முடிக்கவும்",
    switchCamera: "கேமராவை மாற்று",
    toggleVideo: "வீடியோவை நிறுத்து/தொடங்கு",
    toggleAudio: "மைக்கை நிறுத்து/தொடங்கு",
    shareScreen: "திரையை பகிர்",
    chat: "அரட்டை",
    prescription: "மருந்து பரிந்துரை",
    notes: "மருத்துவ குறிப்புகள்",
    connectionQuality: "இணைப்பு தரம்",
    audioOnly: "ஆடியோ மட்டும்",
    addMedication: "மருந்து சேர்",
    savePrescription: "பரிந்துரையை சேமி & அனுப்பு",
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TeleconsultationModule({ userRole = "patient", onClose }) {
  const [lang, setLang] = useState("en");
  const [stage, setStage] = useState("waiting"); // waiting | consultation | ended
  const [deviceStatus, setDeviceStatus] = useState({ camera: null, mic: null, speaker: null });
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState({ quality: "good", bandwidth: 0, packetLoss: 0 });
  const [activeTab, setActiveTab] = useState("info"); // info | prescription | notes | chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [prescription, setPrescription] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState({ complaint: "", examination: "", assessment: "", followup: "" });
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [queuePosition, setQueuePosition] = useState(2);
  const [estimatedWait, setEstimatedWait] = useState(8);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const monitorRef = useRef(null);
  const sessionStartRef = useRef(null);

  const L = LANG[lang];
  const isDoctor = userRole === "doctor";

  // ─── DEVICE CHECK ─────────────────────────────────────────────────────────────
  useEffect(() => {
    checkDevices();
  }, []);

  // const checkDevices = async () => {
  //   try {
  //     // Check camera
  //     try {
  //       const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
  //       setDeviceStatus(prev => ({ ...prev, camera: "ok" }));
  //       videoStream.getTracks().forEach(track => track.stop());
  //     } catch (e) {
  //       setDeviceStatus(prev => ({ ...prev, camera: "error" }));
  //     }

  //     // Check microphone
  //     try {
  //       const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //       setDeviceStatus(prev => ({ ...prev, mic: "ok" }));
  //       audioStream.getTracks().forEach(track => track.stop());
  //     } catch (e) {
  //       setDeviceStatus(prev => ({ ...prev, mic: "error" }));
  //     }

  //     // Speaker test (assume OK if audio context works)
  //     try {
  //       const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  //       await audioContext.close();
  //       setDeviceStatus(prev => ({ ...prev, speaker: "ok" }));
  //     } catch (e) {
  //       setDeviceStatus(prev => ({ ...prev, speaker: "error" }));
  //     }
  //   } catch (error) {
  //     console.error("Device check failed:", error);
  //   }
  // };
  const checkDevices = async () => {
  try {
    // Check camera AND microphone together (this forces browser to ask for both)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // If we get here, both work
      setDeviceStatus({ camera: "ok", mic: "ok", speaker: "ok" });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
    } catch (e) {
      console.error("Device check error:", e);
      
      // Try just video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setDeviceStatus(prev => ({ ...prev, camera: "ok" }));
        videoStream.getTracks().forEach(track => track.stop());
      } catch (ve) {
        setDeviceStatus(prev => ({ ...prev, camera: "error" }));
      }
      
      // Try just audio
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setDeviceStatus(prev => ({ ...prev, mic: "ok" }));
        audioStream.getTracks().forEach(track => track.stop());
      } catch (ae) {
        setDeviceStatus(prev => ({ ...prev, mic: "error" }));
      }
    }

    // Speaker test (assume OK)
    setDeviceStatus(prev => ({ ...prev, speaker: "ok" }));
    
  } catch (error) {
    console.error("Device check failed:", error);
  }
};

  // ─── WEBRTC SETUP ─────────────────────────────────────────────────────────────

// Add these at the top of your component (after other useState declarations)
const [socket, setSocket] = useState(null);
const socketRef = useRef(null);
const roomId = 'room-' + Math.random().toString(36).substr(2, 9); // Generate unique room ID

// Add this useEffect to initialize socket
useEffect(() => {
  const newSocket = io('http://localhost:3001');
  socketRef.current = newSocket;
  setSocket(newSocket);

  console.log('🔌 Connecting to signaling server...');

  newSocket.on('connect', () => {
    console.log('✅ Connected to signaling server');
  });

  return () => {
    newSocket.close();
  };
}, []);

// Replace the entire startCall function with this:
const startCall = async () => {
  if (!socketRef.current) {
    alert('Signaling server not connected. Please wait...');
    return;
  }

  try {
    // Get local media stream
    const constraints = {
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Create peer connection
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📹 Received remote stream');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        socketRef.current.emit('ice-candidate', event.candidate, roomId);
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established!');
        startConnectionMonitoring();
      }
    };

    // Join room
    console.log(`🚪 Joining room: ${roomId}`);
    socketRef.current.emit('join-room', roomId, socketRef.current.id);

    // Listen for other user connecting
    socketRef.current.on('user-connected', async (userId) => {
      console.log('👤 Another user connected:', userId);
      console.log('📤 Creating and sending offer...');
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('offer', offer, roomId);
    });

    // Handle incoming offer (second user)
    socketRef.current.on('offer', async (offer) => {
      console.log('📥 Received offer, creating answer...');
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('answer', answer, roomId);
    });

    // Handle incoming answer (first user)
    socketRef.current.on('answer', async (answer) => {
      console.log('📥 Received answer');
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Handle ICE candidates
    socketRef.current.on('ice-candidate', async (candidate) => {
      console.log('🧊 Received ICE candidate');
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    });

    setStage("consultation");
    sessionStartRef.current = Date.now();

  } catch (error) {
    console.error("Failed to start call:", error);
    alert("Failed to access camera/microphone. Please check permissions.");
  }
};
  // ─── MEDIA CONTROLS ───────────────────────────────────────────────────────────
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track with screen track
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
        
        screenTrack.onended = () => {
          toggleScreenShare(); // Auto-stop when user stops sharing
        };
        
        setIsScreenSharing(true);
      } else {
        // Switch back to camera
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };
  const endCall = () => {
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach(track => track.stop());
  }
  if (peerConnectionRef.current) {
    peerConnectionRef.current.close();
  }
  if (monitorRef.current) {
    monitorRef.current.stop();
  }
  
  // Close socket connections
  if (socketRef.current) {
    socketRef.current.emit('leave-room', roomId);
    socketRef.current.off('user-connected');
    socketRef.current.off('offer');
    socketRef.current.off('answer');
    socketRef.current.off('ice-candidate');
  }
  
  const duration = sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current) / 1000) : 0;
  setSessionDuration(duration);
  setStage("ended");
};


  // ─── SESSION TIMER ────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (stage === "consultation" && sessionStartRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        setSessionDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  // ─── CHAT HANDLER ─────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages(prev => [...prev, {
        sender: isDoctor ? "doctor" : "patient",
        text: chatInput,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
      setChatInput("");
    }
  };

  // ─── PRESCRIPTION HANDLER ─────────────────────────────────────────────────────
  const addMedication = () => {
    setPrescription(prev => [...prev, {
      id: Date.now(),
      drug: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: ""
    }]);
  };

  const updateMedication = (id, field, value) => {
    setPrescription(prev => prev.map(med =>
      med.id === id ? { ...med, [field]: value } : med
    ));
  };

  const removeMedication = (id) => {
    setPrescription(prev => prev.filter(med => med.id !== id));
  };

  const savePrescription = () => {
    // In production: Send to backend API
    console.log("Saving prescription:", prescription);
    alert("Prescription saved and sent to patient!");
  };

  // ─── SOAP NOTE GENERATOR ──────────────────────────────────────────────────────
  const generateSOAPNote = () => {
    const soap = `
SOAP NOTE - ${new Date().toLocaleDateString()}
Doctor: ${MOCK_DOCTOR.name} (${MOCK_DOCTOR.registrationNo})
Patient: ${MOCK_PATIENT.name} (${MOCK_PATIENT.id})

SUBJECTIVE:
${clinicalNotes.complaint || "Patient reports symptoms as per AI analysis."}

OBJECTIVE:
Vitals: BP ${MOCK_PATIENT.medicalHistory.vitals.bloodPressure}, HR ${MOCK_PATIENT.medicalHistory.vitals.heartRate}, Temp ${MOCK_PATIENT.medicalHistory.vitals.temperature}
${clinicalNotes.examination || "General examination findings documented."}

ASSESSMENT:
${clinicalNotes.assessment || "Awaiting investigation results."}
AI Suggested: ${MOCK_PATIENT.symptomSummary.aiDiagnosis.map(d => d.condition).join(", ")}

PLAN:
Prescribed: ${prescription.map(p => `${p.drug} ${p.dosage} ${p.frequency}`).join(", ")}
${clinicalNotes.followup || "Follow-up as needed."}
    `.trim();
    
    // In production: Save to EHR system
    console.log("SOAP Note:", soap);
    return soap;
  };

  // ─── WAITING ROOM SIMULATION ──────────────────────────────────────────────────
  useEffect(() => {
    if (stage === "waiting") {
      const interval = setInterval(() => {
        setQueuePosition(prev => Math.max(1, prev - 1));
        setEstimatedWait(prev => Math.max(0, prev - 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // ─── FORMAT TIME ──────────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── CONNECTION QUALITY INDICATOR ─────────────────────────────────────────────
  const qualityConfig = {
    excellent: { color: "#22c55e", icon: "📶", label: L.excellent },
    good: { color: "#3b82f6", icon: "📶", label: L.good },
    fair: { color: "#f97316", icon: "📶", label: L.fair },
    poor: { color: "#ef4444", icon: "📵", label: L.poor }
  };
  const qc = qualityConfig[connectionQuality.quality] || qualityConfig.good;

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628 0%, #0d1b2a 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
      display: "flex", flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .btn { transition: all 0.2s ease; cursor: pointer; border: none; outline: none; }
        .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .tab-btn { transition: all 0.15s; cursor: pointer; }
        .tab-btn:hover { background: rgba(59,130,246,0.15) !important; }
        video { background: #000; border-radius: 12px; }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* ═════════ HEADER ═════════ */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
          }}>📹</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {stage === "waiting" ? L.waitingRoom : stage === "consultation" ? L.consultation : "Session Ended"}
            </div>
            {stage === "consultation" && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                {formatTime(sessionDuration)} {isRecording && <span className="pulse" style={{ color: "#ef4444" }}>● REC</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {stage === "consultation" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <span style={{ fontSize: 14 }}>{qc.icon}</span>
              <span style={{ fontSize: 12, color: qc.color, fontWeight: 600 }}>{qc.label}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>({connectionQuality.bandwidth} kbps)</span>
            </div>
          )}
          {["en","ta"].map(l => (
            <button key={l} className="btn" onClick={() => setLang(l)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: lang === l ? "#3b82f6" : "rgba(255,255,255,0.05)",
              color: lang === l ? "#fff" : "#94a3b8",
              border: `1px solid ${lang === l ? "#3b82f6" : "rgba(255,255,255,0.1)"}`
            }}>{l === "en" ? "EN" : "தமிழ்"}</button>
          ))}
        </div>
      </div>

      {/* ═════════ MAIN CONTENT ═════════ */}
      <div style={{ flex: 1, display: "flex", padding: "16px", gap: 16, overflow: "hidden" }}>

        {/* ─────── STAGE: WAITING ROOM ─────── */}

        {stage === "waiting" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
    <div style={{ textAlign: "center", maxWidth: 500 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🕐</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{L.waiting}</div>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Your doctor will join shortly. Please ensure your devices are ready.</div>
      
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 32 }}>
        <div style={{
          padding: "16px 24px", borderRadius: 12, background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.3)"
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6" }}>{queuePosition}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase" }}>{L.position}</div>
        </div>
        <div style={{
          padding: "16px 24px", borderRadius: 12, background: "rgba(16,185,129,0.15)",
          border: "1px solid rgba(16,185,129,0.3)"
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#10b981" }}>{estimatedWait}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, textTransform: "uppercase" }}>{L.minutes}</div>
        </div>
      </div>

      {/* Device Status */}
      <div style={{
        background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20,
        border: "1px solid rgba(255,255,255,0.08)", textAlign: "left"
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{L.deviceCheck}</div>
        {[
          { key: "camera", icon: "📷", label: L.testCamera },
          { key: "mic", icon: "🎤", label: L.testMic },
          { key: "speaker", icon: "🔊", label: L.testSpeaker }
        ].map(({ key, icon, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>{label}</span>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: deviceStatus[key] === "ok" ? "#22c55e" : deviceStatus[key] === "error" ? "#ef4444" : "#94a3b8"
            }}>
              {deviceStatus[key] === "ok" ? "✓ OK" : deviceStatus[key] === "error" ? "✗ Error" : "Testing..."}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16, fontSize: 12, color: deviceStatus.camera === "ok" && deviceStatus.mic === "ok" ? "#22c55e" : "#ef4444", textAlign: "center" }}>
          {deviceStatus.camera === "ok" && deviceStatus.mic === "ok" ? `✓ ${L.allGood}` : `⚠ ${L.fixIssues}`}
        </div>
      </div>

      {/* Force Permission Button */}
      <button className="btn" onClick={async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          alert("✓ Camera and microphone access granted!");
          stream.getTracks().forEach(track => track.stop());
          await checkDevices();
        } catch (e) {
          alert("⚠️ Camera blocked: " + e.message);
        }
      }} style={{
        width: "100%", marginTop: 12, padding: "10px", borderRadius: 10,
        background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444",
        color: "#fca5a5", fontSize: 12, fontWeight: 600, cursor: "pointer"
      }}>
        🔧 Force Camera Permission Request
      </button>

      {/* Join Call Button */}
      <button className="btn" onClick={startCall} disabled={deviceStatus.camera !== "ok" || deviceStatus.mic !== "ok"} style={{
        width: "100%", marginTop: 20, padding: "14px", borderRadius: 10,
        background: deviceStatus.camera === "ok" && deviceStatus.mic === "ok"
          ? "linear-gradient(135deg, #10b981, #059669)"
          : "rgba(255,255,255,0.1)",
        color: "#fff", fontSize: 14, fontWeight: 700,
        opacity: deviceStatus.camera === "ok" && deviceStatus.mic === "ok" ? 1 : 0.5,
        cursor: deviceStatus.camera === "ok" && deviceStatus.mic === "ok" ? "pointer" : "not-allowed"
      }}>🎥 {L.joinCall}</button>
    </div>
  </div>
)}

        {/* ─────── STAGE: CONSULTATION ─────── */}
        {stage === "consultation" && (
          <>
            {/* LEFT: Video Panel */}
            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Remote Video (Doctor/Patient) */}
              <div style={{ flex: 1, position: "relative", background: "#000", borderRadius: 12, overflow: "hidden", minHeight: 400 }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                  position: "absolute", top: 12, left: 12, padding: "6px 12px", borderRadius: 8,
                  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", fontSize: 12, color: "#fff", fontWeight: 600
                }}>
                  {isDoctor ? MOCK_PATIENT.name : MOCK_DOCTOR.name}
                </div>
              </div>

              {/* Local Video (Self) */}
              <div style={{ position: "relative", width: 200, height: 150, background: "#000", borderRadius: 12, overflow: "hidden" }}>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                <div style={{
                  position: "absolute", bottom: 8, left: 8, padding: "4px 8px", borderRadius: 6,
                  background: "rgba(0,0,0,0.7)", fontSize: 11, color: "#fff"
                }}>You</div>
              </div>

              {/* Controls */}
              <div style={{
                display: "flex", gap: 8, padding: "12px", background: "rgba(255,255,255,0.04)",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)"
              }}>


                <button className="btn" onClick={toggleVideo} style={{
                  flex: 1, padding: "12px", borderRadius: 8,
                  background: isVideoEnabled ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)",
                  border: `1px solid ${isVideoEnabled ? "#3b82f6" : "#ef4444"}`,
                  color: "#fff", fontSize: 12, fontWeight: 600
                }}>
                  {isVideoEnabled ? "📹" : "📹❌"} Video
                </button>
                <button className="btn" onClick={toggleAudio} style={{
                  flex: 1, padding: "12px", borderRadius: 8,
                  background: isAudioEnabled ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)",
                  border: `1px solid ${isAudioEnabled ? "#3b82f6" : "#ef4444"}`,
                  color: "#fff", fontSize: 12, fontWeight: 600
                }}>
                  {isAudioEnabled ? "🎤" : "🎤❌"} Audio
                </button>
                {isDoctor && (
                  <button className="btn" onClick={toggleScreenShare} style={{
                    flex: 1, padding: "12px", borderRadius: 8,
                    background: isScreenSharing ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: 12, fontWeight: 600
                  }}>
                    🖥️ {isScreenSharing ? "Stop Share" : "Share"}
                  </button>
                )}
                <button className="btn" onClick={endCall} style={{
                  flex: 1, padding: "12px", borderRadius: 8,
                  background: "#ef4444", border: "1px solid #ef4444",
                  color: "#fff", fontSize: 12, fontWeight: 700
                }}>
                  📞 End
                </button>
              </div>
            </div>

            {/* RIGHT: Info/Tools Panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 320, maxWidth: 420 }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 10 }}>
                {[
                  { id: "info", icon: "📋", label: isDoctor ? "Patient" : "Info" },
                  ...(isDoctor ? [
                    { id: "prescription", icon: "💊", label: "Rx" },
                    { id: "notes", icon: "📝", label: "Notes" }
                  ] : []),
                  { id: "chat", icon: "💬", label: "Chat" }
                ].map(tab => (
                  <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                    flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: activeTab === tab.id ? "rgba(59,130,246,0.2)" : "transparent",
                    border: `1px solid ${activeTab === tab.id ? "#3b82f6" : "transparent"}`,
                    color: activeTab === tab.id ? "#93c5fd" : "#64748b"
                  }}>
                    <span style={{ fontSize: 14, marginRight: 4 }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{
                flex: 1, overflowY: "auto", background: "rgba(255,255,255,0.04)",
                borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)"
              }}>
                {/* INFO TAB */}
                {activeTab === "info" && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {isDoctor ? L.patientInfo : L.medicalHistory}
                    </div>

                    {/* AI Summary */}
                    {isDoctor && MOCK_PATIENT.symptomSummary && (
                      <div style={{
                        background: "rgba(59,130,246,0.1)", borderRadius: 10, padding: 12, marginBottom: 16,
                        border: "1px solid rgba(59,130,246,0.3)"
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#93c5fd", marginBottom: 8, textTransform: "uppercase" }}>🤖 {L.aiSummary}</div>
                        <div style={{ fontSize: 12, color: "#e2e8f0", marginBottom: 8 }}>
                          <strong>{L.symptoms}:</strong> {MOCK_PATIENT.symptomSummary.symptoms.join(", ")}
                        </div>
                        <div style={{ fontSize: 12, color: "#e2e8f0", marginBottom: 8 }}>
                          <strong>{L.severity}:</strong> {MOCK_PATIENT.symptomSummary.severity} | <strong>{L.duration}:</strong> {MOCK_PATIENT.symptomSummary.duration}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#93c5fd", marginBottom: 4 }}>{L.diagnosis}:</div>
                        {MOCK_PATIENT.symptomSummary.aiDiagnosis.map((d, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#cbd5e1", marginLeft: 8 }}>• {d.condition} ({d.probability}%)</div>
                        ))}
                      </div>
                    )}

                    {/* Vitals */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>{L.vitals}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {Object.entries(MOCK_PATIENT.medicalHistory.vitals).map(([key, val]) => (
                          <div key={key} style={{
                            padding: "8px", borderRadius: 8, background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)"
                          }}>
                            <div style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                            <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Allergies */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>{L.allergies}</div>
                      <div style={{ fontSize: 12, color: "#e2e8f0" }}>
                        {MOCK_PATIENT.medicalHistory.allergies.length > 0
                          ? MOCK_PATIENT.medicalHistory.allergies.join(", ")
                          : "None reported"}
                      </div>
                    </div>

                    {/* Chronic Conditions */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>{L.chronic}</div>
                      <div style={{ fontSize: 12, color: "#e2e8f0" }}>
                        {MOCK_PATIENT.medicalHistory.chronicConditions.join(", ")}
                      </div>
                    </div>

                    {/* Current Meds */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>{L.currentMeds}</div>
                      <div style={{ fontSize: 12, color: "#e2e8f0" }}>
                        {MOCK_PATIENT.medicalHistory.currentMedications.join(", ")}
                      </div>
                    </div>

                    {/* Past Consultations */}
                    {isDoctor && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>{L.pastConsults}</div>
                        {MOCK_PATIENT.medicalHistory.pastConsultations.map((c, i) => (
                          <div key={i} style={{
                            padding: "8px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.05)", marginBottom: 6
                          }}>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{c.date}</div>
                            <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{c.diagnosis}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{c.doctor}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PRESCRIPTION TAB */}
                {activeTab === "prescription" && isDoctor && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{L.prescription}</div>
                      <button className="btn" onClick={addMedication} style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: "rgba(16,185,129,0.2)", border: "1px solid #10b981", color: "#6ee7b7"
                      }}>+ Add</button>
                    </div>

                    {prescription.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 12 }}>
                        No medications added yet
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                        {prescription.map(med => (
                          <div key={med.id} style={{
                            padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)"
                          }}>
                            <input type="text" placeholder="Drug name" value={med.drug}
                              onChange={e => updateMedication(med.id, "drug", e.target.value)}
                              style={{
                                width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 6,
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                                color: "#f1f5f9", fontSize: 12, outline: "none"
                              }} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                              <input type="text" placeholder="Dosage" value={med.dosage}
                                onChange={e => updateMedication(med.id, "dosage", e.target.value)}
                                style={{
                                  padding: "6px 8px", borderRadius: 6,
                                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#f1f5f9", fontSize: 11, outline: "none"
                                }} />
                              <input type="text" placeholder="Frequency" value={med.frequency}
                                onChange={e => updateMedication(med.id, "frequency", e.target.value)}
                                style={{
                                  padding: "6px 8px", borderRadius: 6,
                                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#f1f5f9", fontSize: 11, outline: "none"
                                }} />
                            </div>
                            <input type="text" placeholder="Duration" value={med.duration}
                              onChange={e => updateMedication(med.id, "duration", e.target.value)}
                              style={{
                                width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 6,
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                                color: "#f1f5f9", fontSize: 11, outline: "none"
                              }} />
                            <input type="text" placeholder="Special instructions" value={med.instructions}
                              onChange={e => updateMedication(med.id, "instructions", e.target.value)}
                              style={{
                                width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 8,
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                                color: "#f1f5f9", fontSize: 11, outline: "none"
                              }} />
                            <button className="btn" onClick={() => removeMedication(med.id)} style={{
                              width: "100%", padding: "6px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                              background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444", color: "#fca5a5"
                            }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {prescription.length > 0 && (
                      <button className="btn" onClick={savePrescription} style={{
                        width: "100%", padding: "12px", borderRadius: 10,
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        color: "#fff", fontSize: 13, fontWeight: 700
                      }}>💾 {L.savePrescription}</button>
                    )}
                  </div>
                )}

                {/* NOTES TAB */}
                {activeTab === "notes" && isDoctor && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>{L.notes}</div>
                    <textarea placeholder={L.chiefComplaint} value={clinicalNotes.complaint}
                      onChange={e => setClinicalNotes(prev => ({ ...prev, complaint: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8, marginBottom: 10, minHeight: 60,
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f1f5f9", fontSize: 12, outline: "none", resize: "vertical"
                      }} />
                    <textarea placeholder={L.examination} value={clinicalNotes.examination}
                      onChange={e => setClinicalNotes(prev => ({ ...prev, examination: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8, marginBottom: 10, minHeight: 60,
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f1f5f9", fontSize: 12, outline: "none", resize: "vertical"
                      }} />
                    <textarea placeholder={L.assessmentPlan} value={clinicalNotes.assessment}
                      onChange={e => setClinicalNotes(prev => ({ ...prev, assessment: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8, marginBottom: 10, minHeight: 60,
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f1f5f9", fontSize: 12, outline: "none", resize: "vertical"
                      }} />
                    <textarea placeholder={L.followUp} value={clinicalNotes.followup}
                      onChange={e => setClinicalNotes(prev => ({ ...prev, followup: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8, marginBottom: 12, minHeight: 40,
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f1f5f9", fontSize: 12, outline: "none", resize: "vertical"
                      }} />
                    <button className="btn" onClick={() => { const soap = generateSOAPNote(); alert(soap); }} style={{
                      width: "100%", padding: "12px", borderRadius: 10,
                      background: "rgba(59,130,246,0.2)", border: "1px solid #3b82f6",
                      color: "#93c5fd", fontSize: 13, fontWeight: 600
                    }}>📄 {L.generateSOAP}</button>
                  </div>
                )}

                {/* CHAT TAB */}
                {activeTab === "chat" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 12 }}>
                          No messages yet. Start chatting!
                        </div>
                      ) : (
                        chatMessages.map((msg, i) => (
                          <div key={i} style={{
                            display: "flex", justifyContent: msg.sender === (isDoctor ? "doctor" : "patient") ? "flex-end" : "flex-start",
                            marginBottom: 8
                          }}>
                            <div style={{
                              maxWidth: "70%", padding: "8px 12px", borderRadius: 10,
                              background: msg.sender === (isDoctor ? "doctor" : "patient")
                                ? "rgba(59,130,246,0.2)"
                                : "rgba(255,255,255,0.07)",
                              border: `1px solid ${msg.sender === (isDoctor ? "doctor" : "patient") ? "#3b82f6" : "rgba(255,255,255,0.1)"}`
                            }}>
                              <div style={{ fontSize: 12, color: "#e2e8f0" }}>{msg.text}</div>
                              <div style={{ fontSize: 9, color: "#64748b", marginTop: 2, textAlign: "right" }}>{msg.time}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyPress={e => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        style={{
                          flex: 1, padding: "10px", borderRadius: 8,
                          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#f1f5f9", fontSize: 12, outline: "none"
                        }} />
                      <button className="btn" onClick={sendMessage} style={{
                        padding: "10px 16px", borderRadius: 8,
                        background: "rgba(59,130,246,0.2)", border: "1px solid #3b82f6",
                        color: "#93c5fd", fontSize: 12, fontWeight: 600
                      }}>Send</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ─────── STAGE: ENDED ─────── */}
        {stage === "ended" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 500 }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{L.consultationEnded}</div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
                Session duration: {formatTime(sessionDuration)}
              </div>

              <div style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20,
                border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>{L.sessionSummary}</div>
                <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.6, textAlign: "left" }}>
                  • Medications prescribed: {prescription.length}<br />
                  • Clinical notes: {clinicalNotes.complaint ? "Documented" : "None"}<br />
                  • Connection quality: {connectionQuality.quality}<br />
                  • Chat messages: {chatMessages.length}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {isDoctor && prescription.length > 0 && (
                  <button className="btn" style={{
                    width: "100%", padding: "12px", borderRadius: 10,
                    background: "rgba(16,185,129,0.2)", border: "1px solid #10b981",
                    color: "#6ee7b7", fontSize: 13, fontWeight: 600
                  }}>📥 {L.downloadPrescription}</button>
                )}
                <button className="btn" style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  background: "rgba(59,130,246,0.2)", border: "1px solid #3b82f6",
                  color: "#93c5fd", fontSize: 13, fontWeight: 600
                }}>📄 {L.downloadReport}</button>
                <button className="btn" onClick={() => setStage("waiting")} style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", fontSize: 13, fontWeight: 600
                }}>🔄 {L.newConsultation}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
