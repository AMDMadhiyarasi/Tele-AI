// import AISymptomChecker from './AISymptomChecker';

// function App() {
//   return <AISymptomChecker />;
// }

// export default App;

import { useState } from 'react';
import AISymptomChecker from './AISymptomChecker';
import TeleconsultationModule from './TeleconsultationModule';

function App() {
  const [view, setView] = useState('checker'); // 'checker' | 'consult'
  const [userRole, setUserRole] = useState('patient'); // 'patient' | 'doctor'

  return (
    <div>
      {/* Navigation */}
      <div style={{ padding: 16, display: 'flex', gap: 12, background: '#1e293b' }}>
        <button onClick={() => setView('checker')} 
                style={{ padding: '8px 16px', borderRadius: 8, background: view === 'checker' ? '#3b82f6' : '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Symptom Checker
        </button>
        <button onClick={() => setView('consult')} 
                style={{ padding: '8px 16px', borderRadius: 8, background: view === 'consult' ? '#3b82f6' : '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Teleconsultation
        </button>
        {view === 'consult' && (
          <button onClick={() => setUserRole(userRole === 'patient' ? 'doctor' : 'patient')}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
            Switch to {userRole === 'patient' ? 'Doctor' : 'Patient'}
          </button>
        )}
      </div>

      {/* Views */}
      {view === 'checker' && <AISymptomChecker />}
      {view === 'consult' && <TeleconsultationModule userRole={userRole} />}
    </div>
  );
}

export default App;