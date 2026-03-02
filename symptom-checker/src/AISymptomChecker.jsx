import { useState, useEffect, useRef } from "react";

// ─── KNOWLEDGE BASE ────────────────────────────────────────────────────────────
// Layer 1: Rule-based symptom→condition engine (JSON knowledge base)
const SYMPTOM_DB = [
  // Common symptoms grouped by body system
  // General
  { id: "fever", label: "Fever / High Temperature", tamil: "காய்ச்சல்", system: "general", weight: 3 },
  { id: "fatigue", label: "Fatigue / Weakness", tamil: "சோர்வு / அசதி", system: "general", weight: 2 },
  { id: "chills", label: "Chills / Shivering", tamil: "குளிர் நடுக்கம்", system: "general", weight: 2 },
  { id: "weight_loss", label: "Unexplained Weight Loss", tamil: "உடல் எடை குறைவு", system: "general", weight: 3 },
  { id: "night_sweats", label: "Night Sweats", tamil: "இரவு வியர்வை", system: "general", weight: 2 },
  // Head / Neuro
  { id: "headache", label: "Headache", tamil: "தலைவலி", system: "neuro", weight: 2 },
  { id: "severe_headache", label: "Sudden Severe Headache", tamil: "திடீர் கடும் தலைவலி", system: "neuro", weight: 5, redFlag: true },
  { id: "dizziness", label: "Dizziness / Vertigo", tamil: "தலைசுற்றல்", system: "neuro", weight: 2 },
  { id: "confusion", label: "Confusion / Disorientation", tamil: "குழப்பம்", system: "neuro", weight: 4, redFlag: true },
  { id: "vision_loss", label: "Sudden Vision Loss / Blurred Vision", tamil: "திடீர் பார்வை இழப்பு", system: "neuro", weight: 5, redFlag: true },
  { id: "stiff_neck", label: "Stiff Neck", tamil: "கழுத்து விறைப்பு", system: "neuro", weight: 4, redFlag: true },
  { id: "seizure", label: "Seizure / Convulsion", tamil: "வலிப்பு", system: "neuro", weight: 5, redFlag: true },
  // Chest / Cardiac
  { id: "chest_pain", label: "Chest Pain / Tightness", tamil: "மார்பு வலி", system: "cardiac", weight: 5, redFlag: true },
  { id: "palpitations", label: "Heart Palpitations", tamil: "இதயத் துடிப்பு", system: "cardiac", weight: 3 },
  { id: "shortness_breath", label: "Shortness of Breath", tamil: "மூச்சு திணறல்", system: "cardiac", weight: 4, redFlag: true },
  { id: "left_arm_pain", label: "Left Arm / Jaw Pain", tamil: "இடது கை வலி", system: "cardiac", weight: 5, redFlag: true },
  // Respiratory
  { id: "cough", label: "Cough", tamil: "இருமல்", system: "respiratory", weight: 2 },
  { id: "dry_cough", label: "Dry Cough (persistent)", tamil: "வறட்சி இருமல்", system: "respiratory", weight: 2 },
  { id: "coughing_blood", label: "Coughing Blood", tamil: "இரத்த இருமல்", system: "respiratory", weight: 5, redFlag: true },
  { id: "wheezing", label: "Wheezing / Whistling Breath", tamil: "சீழ்க்கை சத்தம்", system: "respiratory", weight: 3 },
  { id: "runny_nose", label: "Runny / Blocked Nose", tamil: "மூக்கு ஒழுகுதல்", system: "respiratory", weight: 1 },
  { id: "sore_throat", label: "Sore Throat", tamil: "தொண்டை வலி", system: "respiratory", weight: 2 },
  // Abdomen / GI
  { id: "nausea", label: "Nausea", tamil: "குமட்டல்", system: "gi", weight: 2 },
  { id: "vomiting", label: "Vomiting", tamil: "வாந்தி", system: "gi", weight: 2 },
  { id: "diarrhea", label: "Diarrhea", tamil: "வயிற்றுப்போக்கு", system: "gi", weight: 2 },
  { id: "abdominal_pain", label: "Abdominal / Stomach Pain", tamil: "வயிற்று வலி", system: "gi", weight: 3 },
  { id: "severe_abdominal", label: "Severe Abdominal Pain", tamil: "கடும் வயிற்று வலி", system: "gi", weight: 4, redFlag: true },
  { id: "blood_stool", label: "Blood in Stool", tamil: "மலத்தில் இரத்தம்", system: "gi", weight: 5, redFlag: true },
  { id: "jaundice", label: "Jaundice / Yellow Skin-Eyes", tamil: "மஞ்சள் காமாலை", system: "gi", weight: 4 },
  // Skin
  { id: "rash", label: "Skin Rash / Red Spots", tamil: "தோல் படை / சிவப்பு புள்ளிகள்", system: "skin", weight: 3 },
  { id: "itching", label: "Itching / Hives", tamil: "அரிப்பு / படை", system: "skin", weight: 2 },
  { id: "joint_pain", label: "Joint Pain / Body Ache", tamil: "மூட்டு வலி / உடல் வலி", system: "musculo", weight: 3 },
  { id: "muscle_pain", label: "Muscle Pain", tamil: "தசை வலி", system: "musculo", weight: 2 },
  { id: "swollen_joints", label: "Swollen Joints", tamil: "மூட்டு வீக்கம்", system: "musculo", weight: 3 },
  // Urinary
  { id: "painful_urination", label: "Painful Urination", tamil: "சிறுநீர் எரிவு", system: "urinary", weight: 3 },
  { id: "blood_urine", label: "Blood in Urine", tamil: "சிறுநீரில் இரத்தம்", system: "urinary", weight: 5, redFlag: true },
  { id: "frequent_urination", label: "Frequent Urination", tamil: "அடிக்கடி சிறுநீர்", system: "urinary", weight: 2 },
  // Eyes
  { id: "eye_pain", label: "Eye Pain / Redness", tamil: "கண் வலி / சிவப்பு", system: "eyes", weight: 2 },
  { id: "photophobia", label: "Sensitivity to Light", tamil: "வெளிச்சம் தாங்காமை", system: "eyes", weight: 3 },
];

// Layer 2: Disease knowledge base with weighted symptom matching
const DISEASE_DB = [
  {
    id: "dengue", name: "Dengue Fever", tamil: "டெங்கு காய்ச்சல்",
    symptoms: ["fever", "headache", "joint_pain", "muscle_pain", "rash", "eye_pain", "fatigue", "nausea", "vomiting"],
    weights: { fever: 5, headache: 4, joint_pain: 5, muscle_pain: 4, rash: 4, eye_pain: 3, fatigue: 3, nausea: 2, vomiting: 2 },
    severity: "moderate", specialist: "General Physician / Infectious Disease",
    advice: "Rest, stay hydrated, avoid NSAIDs. Monitor platelet count.", seasonal: ["monsoon"],
    icd10: "A90", color: "#f97316"
  },
  {
    id: "malaria", name: "Malaria", tamil: "மலேரியா",
    symptoms: ["fever", "chills", "headache", "fatigue", "nausea", "vomiting", "sweating", "muscle_pain"],
    weights: { fever: 5, chills: 5, headache: 3, fatigue: 3, nausea: 2, vomiting: 2, muscle_pain: 3 },
    severity: "moderate", specialist: "General Physician / Infectious Disease",
    advice: "Requires blood test confirmation. Do not delay treatment.", seasonal: ["monsoon"],
    icd10: "B50", color: "#10b981"
  },
  {
    id: "typhoid", name: "Typhoid Fever", tamil: "டைபாய்டு",
    symptoms: ["fever", "headache", "abdominal_pain", "nausea", "diarrhea", "fatigue", "rash", "vomiting"],
    weights: { fever: 5, headache: 3, abdominal_pain: 4, nausea: 3, diarrhea: 3, fatigue: 4, rash: 2 },
    severity: "moderate", specialist: "General Physician",
    advice: "Requires Widal test. Avoid street food and untreated water.", seasonal: ["all"],
    icd10: "A01", color: "#8b5cf6"
  },
  {
    id: "chikungunya", name: "Chikungunya", tamil: "சிக்குன்குனியா",
    symptoms: ["fever", "joint_pain", "muscle_pain", "rash", "headache", "fatigue", "swollen_joints"],
    weights: { fever: 4, joint_pain: 6, muscle_pain: 5, rash: 3, headache: 2, fatigue: 3, swollen_joints: 4 },
    severity: "moderate", specialist: "General Physician",
    advice: "No specific treatment. Pain relief and physiotherapy for joint pain.", seasonal: ["monsoon"],
    icd10: "A92.0", color: "#ef4444"
  },
  {
    id: "flu", name: "Influenza (Flu)", tamil: "இன்ஃப்ளூயன்ஸா",
    symptoms: ["fever", "cough", "sore_throat", "runny_nose", "headache", "muscle_pain", "fatigue", "chills"],
    weights: { fever: 4, cough: 3, sore_throat: 3, runny_nose: 2, headache: 3, muscle_pain: 3, fatigue: 3, chills: 2 },
    severity: "mild", specialist: "General Physician",
    advice: "Rest and fluids. Paracetamol for fever. Seek care if breathing worsens.", seasonal: ["all"],
    icd10: "J11", color: "#3b82f6"
  },
  {
    id: "covid", name: "COVID-19", tamil: "கோவிட்-19",
    symptoms: ["fever", "dry_cough", "fatigue", "shortness_breath", "headache", "muscle_pain", "sore_throat", "diarrhea"],
    weights: { fever: 4, dry_cough: 5, fatigue: 4, shortness_breath: 5, headache: 3, muscle_pain: 3, sore_throat: 2 },
    severity: "moderate", specialist: "General Physician / Pulmonologist",
    advice: "Isolate immediately. Get tested. Monitor oxygen levels.", seasonal: ["all"],
    icd10: "U07.1", color: "#f43f5e"
  },
  {
    id: "tuberculosis", name: "Tuberculosis (TB)", tamil: "காசநோய்",
    symptoms: ["dry_cough", "coughing_blood", "weight_loss", "night_sweats", "fever", "fatigue", "chest_pain"],
    weights: { dry_cough: 5, coughing_blood: 6, weight_loss: 5, night_sweats: 4, fever: 3, fatigue: 4, chest_pain: 3 },
    severity: "severe", specialist: "Pulmonologist / TB Specialist",
    advice: "DOTS therapy available free at government hospitals. Do not stop medication.", seasonal: ["all"],
    icd10: "A15", color: "#dc2626"
  },
  {
    id: "uti", name: "Urinary Tract Infection (UTI)", tamil: "சிறுநீர் நோய்த்தொற்று",
    symptoms: ["painful_urination", "frequent_urination", "fever", "abdominal_pain", "blood_urine"],
    weights: { painful_urination: 6, frequent_urination: 5, fever: 2, abdominal_pain: 2, blood_urine: 4 },
    severity: "mild", specialist: "General Physician / Urologist",
    advice: "Drink plenty of water. Complete the full antibiotic course.", seasonal: ["all"],
    icd10: "N39.0", color: "#f59e0b"
  },
  {
    id: "gastroenteritis", name: "Gastroenteritis", tamil: "இரைப்பை குடல் அழற்சி",
    symptoms: ["diarrhea", "vomiting", "nausea", "abdominal_pain", "fever", "fatigue"],
    weights: { diarrhea: 5, vomiting: 4, nausea: 3, abdominal_pain: 3, fever: 2, fatigue: 2 },
    severity: "mild", specialist: "General Physician",
    advice: "ORS solution every hour. Avoid solids until vomiting stops.", seasonal: ["summer"],
    icd10: "A09", color: "#22c55e"
  },
  {
    id: "hepatitis_a", name: "Hepatitis A", tamil: "ஹெப்படைடிஸ் A",
    symptoms: ["jaundice", "fever", "nausea", "vomiting", "abdominal_pain", "fatigue", "dark_urine"],
    weights: { jaundice: 6, fever: 3, nausea: 3, vomiting: 3, abdominal_pain: 3, fatigue: 4 },
    severity: "moderate", specialist: "Gastroenterologist",
    advice: "Rest, avoid alcohol. Usually resolves in weeks with supportive care.", seasonal: ["monsoon"],
    icd10: "B15", color: "#f97316"
  },
  {
    id: "meningitis", name: "Meningitis (EMERGENCY)", tamil: "மூளை காய்ச்சல்",
    symptoms: ["severe_headache", "stiff_neck", "fever", "photophobia", "vomiting", "confusion", "seizure"],
    weights: { severe_headache: 5, stiff_neck: 6, fever: 4, photophobia: 5, vomiting: 3, confusion: 5, seizure: 6 },
    severity: "emergency", specialist: "Emergency / Neurologist",
    advice: "EMERGENCY: Go to hospital immediately. This is life-threatening.", seasonal: ["all"],
    icd10: "G03", color: "#dc2626"
  },
  {
    id: "stroke", name: "Stroke (EMERGENCY)", tamil: "மூளை பக்கவாதம்",
    symptoms: ["severe_headache", "vision_loss", "confusion", "dizziness", "seizure"],
    weights: { severe_headache: 5, vision_loss: 6, confusion: 5, dizziness: 3, seizure: 5 },
    severity: "emergency", specialist: "Emergency / Neurologist",
    advice: "EMERGENCY: Every minute counts. Call 108 immediately.", seasonal: ["all"],
    icd10: "I64", color: "#dc2626"
  },
  {
    id: "heart_attack", name: "Heart Attack (EMERGENCY)", tamil: "இதய தாக்குதல்",
    symptoms: ["chest_pain", "left_arm_pain", "shortness_breath", "palpitations", "nausea", "dizziness", "fatigue"],
    weights: { chest_pain: 7, left_arm_pain: 6, shortness_breath: 5, palpitations: 3, nausea: 2, dizziness: 2 },
    severity: "emergency", specialist: "Emergency / Cardiologist",
    advice: "EMERGENCY: Call 108 immediately. Chew aspirin if available.", seasonal: ["all"],
    icd10: "I21", color: "#dc2626"
  },
  {
    id: "asthma", name: "Asthma Attack", tamil: "ஆஸ்துமா",
    symptoms: ["wheezing", "shortness_breath", "dry_cough", "chest_pain", "fatigue"],
    weights: { wheezing: 6, shortness_breath: 5, dry_cough: 4, chest_pain: 3, fatigue: 2 },
    severity: "moderate", specialist: "Pulmonologist",
    advice: "Use rescue inhaler. Sit upright. Seek emergency care if no relief.", seasonal: ["all"],
    icd10: "J45", color: "#6366f1"
  },
  {
    id: "leptospirosis", name: "Leptospirosis", tamil: "லெப்டோஸ்பைரோஸிஸ்",
    symptoms: ["fever", "headache", "muscle_pain", "joint_pain", "rash", "jaundice", "vomiting"],
    weights: { fever: 5, headache: 3, muscle_pain: 4, joint_pain: 4, rash: 2, jaundice: 3, vomiting: 2 },
    severity: "moderate", specialist: "General Physician / Infectious Disease",
    advice: "Common after flooding. Avoid wading in floodwater. Report to PHC.", seasonal: ["monsoon"],
    icd10: "A27", color: "#0ea5e9"
  },
];

// ─── ENGINE: Weighted Symptom Scoring ─────────────────────────────────────────
function diagnose(selectedSymptoms, patientAge, patientGender) {
  if (selectedSymptoms.length === 0) return [];

  const results = DISEASE_DB.map(disease => {
    let score = 0;
    let matchedSymptoms = [];
    let maxPossible = Object.values(disease.weights).reduce((a, b) => a + b, 0);

    selectedSymptoms.forEach(symId => {
      if (disease.weights[symId]) {
        score += disease.weights[symId];
        matchedSymptoms.push(symId);
      }
    });

    // Age modifier
    if (patientAge > 60 && ["heart_attack", "stroke"].includes(disease.id)) score *= 1.3;
    if (patientAge < 15 && ["meningitis", "dengue"].includes(disease.id)) score *= 1.2;

    // Gender modifier
    if (patientGender === "female" && disease.id === "uti") score *= 1.4;

    const probability = maxPossible > 0 ? Math.min(Math.round((score / maxPossible) * 100), 98) : 0;
    return { ...disease, probability, matchedSymptoms, score };
  });

  return results
    .filter(r => r.probability > 8)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

// ─── RED FLAG CHECK ────────────────────────────────────────────────────────────
function checkRedFlags(selectedSymptoms) {
  const flags = [];
  const syms = selectedSymptoms;

  if (syms.includes("chest_pain") && (syms.includes("left_arm_pain") || syms.includes("shortness_breath")))
    flags.push({ msg: "Possible Cardiac Emergency — possible heart attack", action: "Call 108 NOW" });
  if (syms.includes("severe_headache") && syms.includes("stiff_neck"))
    flags.push({ msg: "Possible Meningitis — life-threatening brain infection", action: "Emergency hospital immediately" });
  if (syms.includes("severe_headache") && syms.includes("vision_loss"))
    flags.push({ msg: "Possible Stroke — every minute matters", action: "Call 108 NOW" });
  if (syms.includes("coughing_blood"))
    flags.push({ msg: "Coughing blood requires urgent medical evaluation", action: "See doctor urgently today" });
  if (syms.includes("blood_stool"))
    flags.push({ msg: "Blood in stool requires immediate evaluation", action: "See doctor urgently today" });
  if (syms.includes("seizure"))
    flags.push({ msg: "Seizures require emergency evaluation", action: "Call 108 NOW" });
  if (syms.includes("confusion") && syms.includes("fever"))
    flags.push({ msg: "Fever with confusion may indicate serious infection", action: "Emergency hospital immediately" });

  return flags;
}

// ─── SEVERITY CALCULATOR ──────────────────────────────────────────────────────
function calcOverallSeverity(diagnoses, selectedSymptoms) {
  const redFlags = checkRedFlags(selectedSymptoms);
  if (redFlags.length > 0) return "emergency";
  if (diagnoses.some(d => d.severity === "emergency" && d.probability > 30)) return "emergency";
  if (diagnoses.some(d => d.severity === "severe" && d.probability > 30)) return "severe";
  if (diagnoses.some(d => d.severity === "moderate" && d.probability > 40)) return "moderate";
  return "mild";
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const LANG = {
  en: {
    title: "AI Symptom Checker",
    subtitle: "Preliminary health assessment powered by AI",
    step1: "Your Profile",
    step2: "Select Symptoms",
    step3: "Severity",
    step4: "Results",
    age: "Age", gender: "Gender", male: "Male", female: "Female", other: "Other",
    duration: "How long?", durationOpts: ["Today", "2–3 days", "1 week", "2+ weeks"],
    severity: "Severity", severityOpts: ["Mild discomfort", "Moderate pain", "Severe pain", "Unbearable"],
    searchPlaceholder: "Search symptoms...",
    analyze: "Analyze Symptoms",
    back: "Back", next: "Next",
    noSymptoms: "Please select at least one symptom",
    disclaimer: "⚠️ This is an AI-assisted preliminary assessment only. It does not replace professional medical advice.",
    bookConsult: "Book Teleconsultation",
    callEmergency: "Call 108 — Emergency",
    matchedSymptoms: "Matched symptoms",
    probability: "Probability",
    icd: "ICD-10",
    specialist: "Consult",
    advice: "Advice",
    topConditions: "Top Probable Conditions",
    emergencyAlert: "EMERGENCY ALERT",
    systems: {
      all: "All", general: "General", neuro: "Neurological", cardiac: "Heart & Chest",
      respiratory: "Respiratory", gi: "Digestive", skin: "Skin", musculo: "Joints & Muscles",
      urinary: "Urinary", eyes: "Eyes"
    }
  },
  ta: {
    title: "AI அறிகுறி பரிசோதனை",
    subtitle: "AI மூலம் ஆரம்ப உடல்நலம் மதிப்பீடு",
    step1: "உங்கள் விவரங்கள்",
    step2: "அறிகுறிகள் தேர்வு",
    step3: "தீவிரம்",
    step4: "முடிவுகள்",
    age: "வயது", gender: "பாலினம்", male: "ஆண்", female: "பெண்", other: "மற்றவை",
    duration: "எத்தனை நாட்கள்?", durationOpts: ["இன்று", "2–3 நாட்கள்", "1 வாரம்", "2+ வாரங்கள்"],
    severity: "தீவிரம்", severityOpts: ["சாதாரண", "மிதமான", "கடுமையான", "தாங்க முடியாத"],
    searchPlaceholder: "அறிகுறிகளை தேடுங்கள்...",
    analyze: "அறிகுறிகளை பகுப்பாய்வு செய்",
    back: "பின்", next: "அடுத்து",
    noSymptoms: "குறைந்தது ஒரு அறிகுறியை தேர்வு செய்யவும்",
    disclaimer: "⚠️ இது AI-உதவி ஆரம்ப மதிப்பீடு மட்டுமே. மருத்துவ ஆலோசனைக்கு மாற்றாகாது.",
    bookConsult: "ஆலோசனை பதிவு செய்க",
    callEmergency: "108 அழைக்கவும் — அவசரம்",
    matchedSymptoms: "பொருந்திய அறிகுறிகள்",
    probability: "சாத்தியக்கூறு",
    icd: "ICD-10",
    specialist: "மருத்துவர்",
    advice: "ஆலோசனை",
    topConditions: "சாத்தியமான நோய்கள்",
    emergencyAlert: "அவசர எச்சரிக்கை",
    systems: {
      all: "அனைத்தும்", general: "பொது", neuro: "நரம்பு", cardiac: "இதயம்",
      respiratory: "சுவாசம்", gi: "செரிமானம்", skin: "தோல்", musculo: "மூட்டு",
      urinary: "சிறுநீர்", eyes: "கண்கள்"
    }
  }
};

const SEVERITY_CONFIG = {
  mild: { label: "Mild", tamilLabel: "சாதாரண", color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", icon: "🟢", action: "Self-care recommended. Monitor symptoms." },
  moderate: { label: "Moderate", tamilLabel: "மிதமான", color: "#f97316", bg: "#fff7ed", border: "#fed7aa", icon: "🟡", action: "Schedule a consultation within 24–48 hours." },
  severe: { label: "Severe", tamilLabel: "கடுமையான", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: "🔴", action: "See a doctor urgently today." },
  emergency: { label: "EMERGENCY", tamilLabel: "அவசரம்", color: "#dc2626", bg: "#fef2f2", border: "#dc2626", icon: "🚨", action: "Go to emergency / Call 108 immediately!" }
};

export default function AISymptomChecker() {
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ age: "", gender: "male" });
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [duration, setDuration] = useState(0);
  const [painLevel, setPainLevel] = useState(3);
  const [systemFilter, setSystemFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(null);
  const [redFlags, setRedFlags] = useState([]);
  const [animIn, setAnimIn] = useState(true);

  const L = LANG[lang];

  const systems = ["all", "general", "neuro", "cardiac", "respiratory", "gi", "skin", "musculo", "urinary", "eyes"];

  const filteredSymptoms = SYMPTOM_DB.filter(s => {
    const matchSystem = systemFilter === "all" || s.system === systemFilter;
    const matchSearch = search === "" ||
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.tamil.includes(search);
    return matchSystem && matchSearch;
  });

  const toggleSymptom = (id) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAnalyze = () => {
    const diag = diagnose(selectedSymptoms, parseInt(profile.age) || 30, profile.gender);
    const flags = checkRedFlags(selectedSymptoms);
    setResults(diag);
    setRedFlags(flags);
    goTo(3);
  };

  const goTo = (s) => {
    setAnimIn(false);
    setTimeout(() => { setStep(s); setAnimIn(true); }, 180);
  };

  const reset = () => {
    setSelectedSymptoms([]); setResults(null); setRedFlags([]);
    setSearch(""); setSystemFilter("all"); setPainLevel(3); setDuration(0);
    goTo(0);
  };

  const overallSeverity = results ? calcOverallSeverity(results, selectedSymptoms) : "mild";
  const sev = SEVERITY_CONFIG[overallSeverity];

  // Progress bar
  const steps = [L.step1, L.step2, L.step3, L.step4];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f1629 0%, #0d2247 40%, #0a1f3d 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        .symptom-chip { transition: all 0.18s ease; cursor: pointer; }
        .symptom-chip:hover { transform: translateY(-2px); }
        .symptom-chip.selected { transform: translateY(-1px); }
        .step-btn { transition: all 0.2s ease; cursor: pointer; }
        .step-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .step-btn:active { transform: translateY(0); }
        .fade-slide { transition: opacity 0.18s ease, transform 0.18s ease; }
        .fade-in { opacity: 1; transform: translateY(0); }
        .fade-out { opacity: 0; transform: translateY(8px); }
        .result-card { transition: all 0.2s ease; }
        .result-card:hover { transform: translateX(4px); }
        .lang-btn { transition: all 0.2s; cursor: pointer; }
        .lang-btn:hover { filter: brightness(1.2); }
        .system-tab { transition: all 0.15s ease; cursor: pointer; }
        .system-tab:hover { background: rgba(59,130,246,0.2) !important; }
        input[type=range] { -webkit-appearance: none; height: 6px; border-radius: 3px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #3b82f6; cursor: pointer; box-shadow: 0 0 6px rgba(59,130,246,0.6); }
        .emergency-pulse { animation: epulse 1.2s ease-in-out infinite; }
        @keyframes epulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); } 50% { box-shadow: 0 0 0 12px rgba(220,38,38,0); } }
        .shimmer { animation: shimmer 2.5s ease-in-out infinite; }
        @keyframes shimmer { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        .prob-bar { transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 4px 12px rgba(59,130,246,0.4)"
          }}>🩺</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.1 }}>{L.title}</div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.03em" }}>{L.subtitle}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["en","ta"].map(l => (
            <button key={l} className="lang-btn" onClick={() => setLang(l)} style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: lang === l ? "#3b82f6" : "rgba(255,255,255,0.07)",
              borderColor: lang === l ? "#3b82f6" : "rgba(255,255,255,0.12)",
              color: lang === l ? "#fff" : "#94a3b8",
            }}>{l === "en" ? "EN" : "தமிழ்"}</button>
          ))}
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div style={{ padding: "16px 24px 0", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: i < step ? "#22c55e" : i === step ? "#3b82f6" : "rgba(255,255,255,0.1)",
                  border: "2px solid",
                  borderColor: i < step ? "#22c55e" : i === step ? "#3b82f6" : "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#fff",
                  transition: "all 0.3s ease",
                  boxShadow: i === step ? "0 0 12px rgba(59,130,246,0.5)" : "none"
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 9, color: i === step ? "#93c5fd" : "#475569", marginTop: 3, textAlign: "center", whiteSpace: "nowrap" }}>{s}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? "#22c55e" : "rgba(255,255,255,0.1)", margin: "0 4px", marginBottom: 16, transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
        <div className={`fade-slide ${animIn ? "fade-in" : "fade-out"}`}>

          {/* STEP 0 — PROFILE */}
          {step === 0 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
                <div style={{ fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>{L.step1}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Help us personalize your assessment</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{L.age}</label>
                  <input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
                    placeholder="e.g. 35" min="1" max="120"
                    style={{
                      width: "100%", marginTop: 8, padding: "12px 16px", borderRadius: 10,
                      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                      color: "#f1f5f9", fontSize: 16, outline: "none",
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{L.gender}</label>
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    {[["male", L.male, "👨"], ["female", L.female, "👩"], ["other", L.other, "🧑"]].map(([val, label, icon]) => (
                      <button key={val} className="step-btn" onClick={() => setProfile(p => ({ ...p, gender: val }))} style={{
                        flex: 1, padding: "12px 8px", borderRadius: 10, border: "1px solid",
                        background: profile.gender === val ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                        borderColor: profile.gender === val ? "#3b82f6" : "rgba(255,255,255,0.1)",
                        color: profile.gender === val ? "#93c5fd" : "#94a3b8",
                        fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      }}>
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button className="step-btn" onClick={() => goTo(1)} style={{
                width: "100%", marginTop: 20, padding: "14px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
                boxShadow: "0 6px 20px rgba(59,130,246,0.35)"
              }}>{L.next} →</button>
            </div>
          )}

          {/* STEP 1 — SYMPTOMS */}
          {step === 1 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{L.step2}</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                    {selectedSymptoms.length} selected
                    {selectedSymptoms.some(id => SYMPTOM_DB.find(s => s.id === id)?.redFlag) &&
                      <span style={{ color: "#ef4444", marginLeft: 8, fontWeight: 600 }}>⚠️ Red-flag symptoms detected</span>}
                  </div>
                </div>
              </div>

              {/* Search */}
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={L.searchPlaceholder}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f1f5f9", fontSize: 13, outline: "none",
                }} />

              {/* System filter */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {systems.map(sys => (
                  <button key={sys} className="system-tab" onClick={() => setSystemFilter(sys)} style={{
                    padding: "5px 10px", borderRadius: 20, border: "1px solid",
                    fontSize: 11, fontWeight: 500, cursor: "pointer",
                    background: systemFilter === sys ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)",
                    borderColor: systemFilter === sys ? "#3b82f6" : "rgba(255,255,255,0.1)",
                    color: systemFilter === sys ? "#93c5fd" : "#64748b",
                  }}>{L.systems[sys]}</button>
                ))}
              </div>

              {/* Symptom chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 340, overflowY: "auto", padding: 4 }}>
                {filteredSymptoms.map(sym => {
                  const sel = selectedSymptoms.includes(sym.id);
                  const isRed = sym.redFlag;
                  return (
                    <button key={sym.id} className={`symptom-chip ${sel ? "selected" : ""}`}
                      onClick={() => toggleSymptom(sym.id)} style={{
                        padding: "8px 14px", borderRadius: 20, border: "1px solid",
                        fontSize: 12, fontWeight: sel ? 600 : 400, cursor: "pointer",
                        background: sel
                          ? isRed ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"
                          : "rgba(255,255,255,0.06)",
                        borderColor: sel
                          ? isRed ? "#ef4444" : "#3b82f6"
                          : "rgba(255,255,255,0.1)",
                        color: sel
                          ? isRed ? "#fca5a5" : "#93c5fd"
                          : "#94a3b8",
                        textAlign: "left",
                      }}>
                      {isRed && sel && <span style={{ marginRight: 4, fontSize: 10 }}>🚨</span>}
                      {lang === "ta" ? sym.tamil : sym.label}
                    </button>
                  );
                })}
                {filteredSymptoms.length === 0 && (
                  <div style={{ color: "#475569", fontSize: 13, padding: 12 }}>No symptoms found. Try a different search.</div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="step-btn" onClick={() => goTo(0)} style={{
                  flex: "0 0 100px", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>← {L.back}</button>
                <button className="step-btn" onClick={() => selectedSymptoms.length > 0 ? goTo(2) : null} style={{
                  flex: 1, padding: "13px", borderRadius: 10, border: "none",
                  background: selectedSymptoms.length > 0
                    ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                    : "rgba(255,255,255,0.08)",
                  color: selectedSymptoms.length > 0 ? "#fff" : "#475569",
                  fontSize: 14, fontWeight: 700, cursor: selectedSymptoms.length > 0 ? "pointer" : "default",
                  boxShadow: selectedSymptoms.length > 0 ? "0 6px 20px rgba(59,130,246,0.3)" : "none"
                }}>
                  {selectedSymptoms.length === 0 ? L.noSymptoms : `${L.next} (${selectedSymptoms.length} symptoms) →`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — SEVERITY */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>📊</div>
                <div style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{L.step3}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Help us understand intensity</div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>{L.severity}</div>
                  <input type="range" min={1} max={10} value={painLevel} onChange={e => setPainLevel(Number(e.target.value))}
                    style={{
                      width: "100%",
                      background: `linear-gradient(to right, #22c55e 0%, #f97316 50%, #ef4444 100%)`,
                    }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <div key={n} style={{ fontSize: 10, color: n === painLevel ? "#fff" : "#475569", fontWeight: n === painLevel ? 700 : 400, transition: "color 0.2s" }}>{n}</div>
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 10, fontSize: 24 }}>
                    {painLevel <= 3 ? "😊" : painLevel <= 6 ? "😐" : painLevel <= 8 ? "😟" : "😰"}
                    <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>
                      {L.severityOpts[Math.min(Math.floor((painLevel - 1) / 2.5), 3)]}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>{L.duration}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {L.durationOpts.map((opt, i) => (
                      <button key={i} className="step-btn" onClick={() => setDuration(i)} style={{
                        flex: "1 1 calc(50% - 4px)", padding: "10px 8px", borderRadius: 10, border: "1px solid",
                        background: duration === i ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                        borderColor: duration === i ? "#3b82f6" : "rgba(255,255,255,0.1)",
                        color: duration === i ? "#93c5fd" : "#64748b",
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                      }}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="step-btn" onClick={() => goTo(1)} style={{
                  flex: "0 0 100px", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>← {L.back}</button>
                <button className="step-btn" onClick={handleAnalyze} style={{
                  flex: 1, padding: "14px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(16,185,129,0.35)", letterSpacing: "0.02em"
                }}>🔍 {L.analyze}</button>
              </div>
            </div>
          )}

          {/* STEP 3 — RESULTS */}
          {step === 3 && results && (
            <div>
              {/* EMERGENCY ALERT */}
              {redFlags.length > 0 && (
                <div className="emergency-pulse" style={{
                  background: "rgba(220,38,38,0.15)", border: "2px solid #dc2626",
                  borderRadius: 14, padding: 16, marginBottom: 20,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>🚨</span>
                    <span style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, color: "#fca5a5", letterSpacing: "0.04em" }}>{L.emergencyAlert}</span>
                  </div>
                  {redFlags.map((f, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ color: "#fca5a5", fontSize: 13, fontWeight: 500 }}>⚠️ {f.msg}</div>
                      <div style={{ color: "#f87171", fontSize: 12, marginTop: 3 }}>→ {f.action}</div>
                    </div>
                  ))}
                  <button className="step-btn" style={{
                    width: "100%", marginTop: 10, padding: "12px", borderRadius: 10, border: "2px solid #dc2626",
                    background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.04em"
                  }}>📞 {L.callEmergency}</button>
                </div>
              )}

              {/* SEVERITY BADGE */}
              <div style={{
                background: sev.bg.replace(")", ", 0.15)").replace("rgb", "rgba"),
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${sev.border}`,
                borderRadius: 14, padding: "14px 18px", marginBottom: 18,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Overall Assessment</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{sev.icon}</span>
                    <span style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 18, color: sev.color }}>{sev.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sev.action}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#475569" }}>Duration: {L.durationOpts[duration]}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>Pain level: {painLevel}/10</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>Symptoms: {selectedSymptoms.length}</div>
                </div>
              </div>

              {/* RESULTS TITLE */}
              <div style={{ fontFamily: "Space Grotesk", fontSize: 17, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>
                {L.topConditions}
              </div>

              {results.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#475569" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div>No strong matches found. Please consult a doctor for an accurate diagnosis.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {results.map((r, idx) => (
                    <div key={r.id} className="result-card" style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${idx === 0 ? r.color + "66" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 14, padding: "16px 18px",
                      borderLeft: `4px solid ${r.color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {idx === 0 && <span style={{ fontSize: 10, background: r.color + "33", color: r.color, padding: "2px 8px", borderRadius: 20, fontWeight: 700, border: `1px solid ${r.color}55` }}>MOST LIKELY</span>}
                            {r.severity === "emergency" && <span style={{ fontSize: 10, background: "rgba(220,38,38,0.2)", color: "#fca5a5", padding: "2px 8px", borderRadius: 20, fontWeight: 700, border: "1px solid rgba(220,38,38,0.4)" }}>EMERGENCY</span>}
                          </div>
                          <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, color: "#f1f5f9", marginTop: 4 }}>
                            {lang === "ta" ? r.tamil : r.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{L.icd}: {r.icd10}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700, color: r.color }}>{r.probability}%</div>
                          <div style={{ fontSize: 10, color: "#475569" }}>{L.probability}</div>
                        </div>
                      </div>

                      {/* Probability bar */}
                      <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                        <div className="prob-bar" style={{ height: "100%", width: `${r.probability}%`, background: r.color, borderRadius: 3 }} />
                      </div>

                      {/* Matched symptoms */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                        {r.matchedSymptoms.slice(0, 5).map(symId => {
                          const sym = SYMPTOM_DB.find(s => s.id === symId);
                          return sym ? (
                            <span key={symId} style={{
                              fontSize: 10, padding: "3px 8px", borderRadius: 20,
                              background: "rgba(255,255,255,0.07)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)"
                            }}>{lang === "ta" ? sym.tamil : sym.label}</span>
                          ) : null;
                        })}
                        {r.matchedSymptoms.length > 5 && <span style={{ fontSize: 10, color: "#475569" }}>+{r.matchedSymptoms.length - 5} more</span>}
                      </div>

                      {/* Advice */}
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, lineHeight: 1.5, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                        💡 {r.advice}
                      </div>

                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        🏥 {L.specialist}: <span style={{ color: "#93c5fd" }}>{r.specialist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {overallSeverity !== "emergency" && (
                  <button className="step-btn" style={{
                    width: "100%", padding: "14px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(59,130,246,0.3)"
                  }}>📹 {L.bookConsult}</button>
                )}
                {overallSeverity === "emergency" && (
                  <button className="step-btn emergency-pulse" style={{
                    width: "100%", padding: "14px", borderRadius: 12, border: "2px solid #dc2626",
                    background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>📞 {L.callEmergency}</button>
                )}
                <button className="step-btn" onClick={reset} style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>🔄 Start New Assessment</button>
              </div>

              {/* DISCLAIMER */}
              <div style={{
                marginTop: 20, padding: "12px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11, color: "#475569", lineHeight: 1.5
              }}>{L.disclaimer}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
