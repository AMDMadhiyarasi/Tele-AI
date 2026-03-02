# Telemedicine Platform for Rural Healthcare in Tamil Nadu

AI-powered symptom checker and teleconsultation module for rural healthcare.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/AMDMadhiyarasi/Tele-AI.git
cd Tele-AI
```

**2. Install dependencies:**
```bash
# Install frontend dependencies
cd symptom-checker
npm install

# Install signaling server dependencies
cd ../signaling-server
npm install
```

### Running the Application

**Terminal 1 - Start Signaling Server:**
```bash
cd signaling-server
node server.js
```
Should show: `🚀 Signaling server running on http://localhost:3001`

**Terminal 2 - Start React App:**
```bash
cd symptom-checker
npm start
```
Will open automatically at: `http://localhost:3000`

## 📱 Features

### AI Symptom Checker
- ✅ Multilingual support (Tamil + English)
- ✅ 40+ symptoms with body system filtering
- ✅ Weighted probabilistic diagnosis
- ✅ Red-flag symptom detection
- ✅ Emergency routing (108 integration)
- ✅ Top 3 differential diagnoses with ICD-10 codes

### Teleconsultation Module
- ✅ WebRTC peer-to-peer video calling
- ✅ Real-time connection quality monitoring
- ✅ Doctor's clinical panel with EHR access
- ✅ Digital e-prescription writer
- ✅ SOAP note generator
- ✅ Low-bandwidth optimization
- ✅ Audio-only fallback mode

## 🏗️ Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js + Express
- **Video**: WebRTC
- **Signaling**: Socket.io
- **Database**: MySQL (Spring Boot integration ready)

## 👥 Team

- **Madhiyarasi AMD** - Information Technology
- **Meghaa Jayakumar** - Information Technology  
- **Narayana K E** - Information Technology

**Rajalakshmi Engineering College, Chennai**

## 📄 License

This project is part of academic research for rural healthcare improvement.