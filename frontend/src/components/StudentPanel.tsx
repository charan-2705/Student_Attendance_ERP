import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface AcademicNote { id: number; subject: string; title: string; date: string; size: string; filePath?: string; }
interface LeaveRequest { id: string; studentId: string; reason: string; startDate: string; endDate: string; status: string; }
interface AttendanceHistoryItem { studentId: string; subject: string; date: string; status: 'Present' | 'Absent'; }
interface ERPDashboardData { subjects: string[]; sharedNotes: AcademicNote[]; leaveRequests: LeaveRequest[]; attendanceLogs?: AttendanceHistoryItem[]; }
interface AIPredictionResult { currentRate: string; predictedRate: string; modelInsights: string; }

interface StudentPanelProps {
  dbData: ERPDashboardData;
  currentView: string;
  session: any;
  fetchERPData: () => void;
}

export default function StudentPanel({ dbData, currentView, session, fetchERPData }: StudentPanelProps) {
  const [simulatedAbsences, setSimulatedAbsences] = useState('0');
  const [aiReport, setAiReport] = useState<AIPredictionResult | null>(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');

  const runAIEngineForecast = () => {
    const token = localStorage.getItem('erp_session_token');
    fetch('http://localhost:5000/api/ai/predict-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ studentId: session?.studentId, additionalProjectedAbsences: simulatedAbsences })
    })
    .then(res => res.json()).then((data: AIPredictionResult) => setAiReport(data));
  };

  useEffect(() => {
    if (currentView === 'student-ai-insights') {
      runAIEngineForecast();
    }
  }, [currentView]);

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('erp_session_token');
    fetch('http://localhost:5000/api/student/apply-leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ studentId: session?.studentId, reason: leaveReason, startDate: leaveStart, endDate: leaveEnd })
    })
    .then(res => res.json()).then(() => {
      alert("Leave exception filed."); setLeaveReason(''); setLeaveStart(''); setLeaveEnd(''); fetchERPData();
    });
  };

  if (currentView === 'student-ai-insights') {
    const rate = aiReport ? parseInt(aiReport.predictedRate) || 0 : 0;
    const isSafe = rate >= 75;

    // Real-Time System Calculations using active database log matrix configurations
    let recoveryMessage = "You are currently trending below the required 75% baseline.";
    
    if (dbData.attendanceLogs && session?.studentId) {
      const currentStudentId = String(session.studentId).trim().toLowerCase();
      
      // Extract live array metrics matching current session token profile
      const studentLogs = dbData.attendanceLogs.filter(
        log => String(log.studentId || '').trim().toLowerCase() === currentStudentId
      );
      
      const actualTotal = studentLogs.length;
      const actualAttended = studentLogs.filter(log => log.status === 'Present').length;
      
      // Factor in the dynamic user interface simulation adjustments
      const projectionAbsences = parseInt(simulatedAbsences) || 0;
      const simulatedTotalConducted = actualTotal + projectionAbsences;
      
      if (!isSafe && simulatedTotalConducted > 0) {
        // Target Threshold Formula: R = Math.ceil((0.75 * Conducted - Attended) / 0.25)
        const classesNeeded = Math.ceil((0.75 * simulatedTotalConducted - actualAttended) / 0.25);
        recoveryMessage = `You need to attend ${Math.max(1, classesNeeded)} more consecutive classes to reach the mandatory 75% threshold.`;
      }
    }

    return (
      <div className="panel animate-fade">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Left Column: Unified Single Graphical Progress Tracker */}
          {aiReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #f3e8ff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <h4 style={{ color: '#4b5563', fontSize: '14px', marginBottom: '10px' }}>PREDICTED SATURATION STATUS</h4>
                <div style={{ width: '100%', height: 200, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={14} startAngle={90} endAngle={-270} data={[{ name: 'Base', value: 100, fill: '#f3e8ff' }, { name: 'Rate', value: rate, fill: isSafe ? '#16a34a' : '#dc2626' }]}>
                      <RadialBar dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <span style={{ fontSize: '32px', fontWeight: 'bold', color: isSafe ? '#16a34a' : '#dc2626' }}>{rate}%</span>
                  </div>
                </div>
              </div>

              {/* Status Banner Layout based on 75% Compliance Target */}
              {isSafe ? (
                <div style={{ 
                  backgroundColor: '#dcfce7', 
                  border: '1px solid #bbf7d0', 
                  color: '#15803d', 
                  padding: '16px', 
                  borderRadius: '8px',
                  fontWeight: '600',
                  textAlign: 'center',
                  fontSize: '16px'
                }}>
                  ✅ Safe Zone
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#fee2e2', 
                  border: '1px solid #fecaca', 
                  color: '#991b1b', 
                  padding: '16px', 
                  borderRadius: '8px'
                }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>⚠️ Attendance Shortage Warning</h4>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', lineHeight: '1.4' }}>
                    {recoveryMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Right Column: Predictive Simulation Sandbox Form Controls */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3>Predictive Simulation Boundary Sandbox</h3>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>Simulate Additional Absences</label>
              <input 
                type="number" 
                min="0" 
                max="30" 
                value={simulatedAbsences} 
                onChange={e => setSimulatedAbsences(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '6px' }} 
              />
            </div>
            <button onClick={runAIEngineForecast} className="submit-btn" style={{ marginTop: '16px', width: '100%' }}>
              Run Calibration Analysis
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (currentView === 'student-logs') {
    return (
      <div className="panel animate-fade">
        <h3>Your Attendance Verification Ledger</h3>
        <table className="erp-table" style={{ marginTop: '16px' }}>
          <thead><tr><th>Date</th><th>Subject Module</th><th>Verification Status</th></tr></thead>
          <tbody>
            {dbData.attendanceLogs?.filter(log => String(log.studentId || '').trim().toLowerCase() === String(session?.studentId || '').trim().toLowerCase()).map((log, i) => (
              <tr key={i}><td>{log.date}</td><td><strong>{log.subject}</strong></td><td><span className={`status-pill ${log.status === 'Present' ? 'approved' : 'rejected'}`}>{log.status}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (currentView === 'student-notes') {
    return (
      <div className="panel animate-fade">
        <h3>Course Study Material Repository</h3>
        <table className="erp-table" style={{ marginTop: '16px' }}>
          <thead><tr><th>Subject</th><th>Document Title</th><th>Published Date</th><th>Size</th><th>Action</th></tr></thead>
          <tbody>
            {dbData.sharedNotes.map(n => (
              <tr key={n.id}><td><span className="status-pill pending">{n.subject}</span></td><td><strong>{n.title}</strong></td><td>{n.date}</td><td><code>{n.size}</code></td>
                <td>{n.filePath ? <a href={`http://localhost:5000${n.filePath}`} download className="download-action-btn present-text" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Download size={14} /> Get Asset</a> : <span style={{ color: '#9ca3af' }}>No file linked</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (currentView === 'student-leave') {
    return (
      <div className="panel animate-fade">
        <form onSubmit={handleLeaveSubmit} style={{ maxWidth: '500px' }}>
          <h3>File Institutional Leave Exception</h3>
          <div className="form-group" style={{ marginTop: '14px' }}><label>Reason Context</label><input type="text" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Provide verification basis..." required /></div>
          <div className="form-row" style={{ marginTop: '12px' }}>
            <div className="form-group"><label>Commence Date</label><input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} required /></div>
            <div className="form-group"><label>Termination Date</label><input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} required /></div>
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '20px' }}>Submit Request Pipeline</button>
        </form>
        <table className="erp-table" style={{ marginTop: '30px' }}>
          <thead><tr><th>ID Code</th><th>Reason</th><th>Timeline Span</th><th>Status</th></tr></thead>
          <tbody>
            {dbData.leaveRequests?.filter(r => String(r.studentId || '').trim().toLowerCase() === String(session?.studentId || '').trim().toLowerCase()).map(r => (
              <tr key={r.id}><td><code>{r.id}</code></td><td>{r.reason}</td><td>{r.startDate} to {r.endDate}</td><td><span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}