import React, { useState } from 'react';
import { UserCheck, FileClock, BookOpen, Check, X, FileSpreadsheet } from 'lucide-react';

interface StudentMetadata { id: string; name: string; section: string; }
interface LeaveRequest { id: string; studentId: string; studentName?: string; reason: string; startDate: string; endDate: string; status: string; }
interface ERPDashboardData { subjects: string[]; studentRecords: StudentMetadata[]; sharedNotes: any[]; leaveRequests: LeaveRequest[]; attendanceLogs?: any[]; }

interface FacultyPanelProps {
  dbData: ERPDashboardData;
  currentView: string;
  fetchERPData: () => void;
  exportTableToCSV: (datasetType: 'students' | 'attendance' | 'leaves') => void;
}

export default function FacultyPanel({ dbData, currentView, fetchERPData, exportTableToCSV }: FacultyPanelProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('Data Science');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRoll, setAttendanceRoll] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('Data Science');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  React.useEffect(() => {
    const initialRoll: Record<string, 'Present' | 'Absent'> = {};
    dbData.studentRecords.forEach((s) => { initialRoll[s.id] = 'Present'; });
    setAttendanceRoll(prev => Object.keys(prev).length === 0 ? initialRoll : prev);
  }, [dbData.studentRecords]);

  const submitAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('erp_session_token');
    const formattedRecords = Object.keys(attendanceRoll).map(id => ({ studentId: id, status: attendanceRoll[id] }));
    fetch('http://localhost:5000/api/attendance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subject: selectedSubject, date: attendanceDate, records: formattedRecords })
    })
    .then(res => res.json()).then(() => { alert("Roster logs securely committed."); fetchERPData(); });
  };

  const handleFacultyLeaveAction = (leaveId: string, status: 'Approved' | 'Rejected') => {
    const token = localStorage.getItem('erp_session_token');
    fetch('http://localhost:5000/api/faculty/leave-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ leaveId, status })
    })
    .then(res => res.json()).then(() => { alert(`Leave application resolved: ${status}`); fetchERPData(); });
  };

  const handleFacultyPostNote = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('erp_session_token');
    const formData = new FormData();
    formData.append('title', noteTitle);
    formData.append('subject', noteSubject);
    if (selectedFile) { formData.append('attachedFile', selectedFile); }

    fetch('http://localhost:5000/api/faculty/post-note', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json()).then(() => {
      alert("Academic file shared successfully.");
      setNoteTitle(''); setSelectedFile(null);
      fetchERPData();
    });
  };

  if (currentView === 'faculty-mark') {
    return (
      <div className="panel animate-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>Roll Call Manager</h3>
          <button onClick={() => exportTableToCSV('attendance')} className="download-action-btn present-text" style={{ padding: '8px 14px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px', fontWeight: '600' }}>
            <FileSpreadsheet size={16} style={{ marginRight: '6px' }} /> Extract Logs
          </button>
        </div>
        <form onSubmit={submitAttendance}>
          <div className="form-row">
            <div className="form-group"><label>Course Module</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>{dbData.subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
            </div>
            <div className="form-group"><label>Run Date</label><input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} required /></div>
          </div>
          <table className="erp-table" style={{ marginTop: '20px' }}>
            <thead><tr><th>ID</th><th>Name</th><th>Status Flag</th></tr></thead>
            <tbody>
              {dbData.studentRecords.map(s => (
                <tr key={s.id}><td><code>{s.id}</code></td><td>{s.name}</td>
                  <td>
                    <div className="radio-group">
                      <label className="radio-label present-text"><input type="radio" name={`att-${s.id}`} checked={attendanceRoll[s.id] === 'Present'} onChange={() => setAttendanceRoll(prev => ({ ...prev, [s.id]: 'Present' }))} /> Present</label>
                      <label className="radio-label absent-text"><input type="radio" name={`att-${s.id}`} checked={attendanceRoll[s.id] === 'Absent'} onChange={() => setAttendanceRoll(prev => ({ ...prev, [s.id]: 'Absent' }))} /> Absent</label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="submit" className="submit-btn" style={{ marginTop: '20px' }}>Commit Roster Sheet</button>
        </form>
      </div>
    );
  }

  if (currentView === 'faculty-leaves') {
    return (
      <div className="panel animate-fade">
        <h3>Leave Request Approvals</h3>
        <table className="erp-table" style={{ marginTop: '16px' }}>
          <thead><tr><th>ID</th><th>Student Name</th><th>Reason Context</th><th>Duration Sequence</th><th>Current Status</th><th>Actions</th></tr></thead>
          <tbody>
            {dbData.leaveRequests.map(req => (
              <tr key={req.id}><td><code>{req.id}</code></td><td><strong>{req.studentName || req.studentId}</strong></td><td>{req.reason}</td><td>{req.startDate} to {req.endDate}</td><td><span className={`status-pill ${req.status.toLowerCase()}`}>{req.status}</span></td>
                <td>
                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="download-action-btn present-text" onClick={() => handleFacultyLeaveAction(req.id, 'Approved')}><Check size={14} /> Accept</button>
                      <button className="download-action-btn absent-text" onClick={() => handleFacultyLeaveAction(req.id, 'Rejected')}><X size={14} /> Deny</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (currentView === 'faculty-notes') {
    return (
      <div className="panel animate-fade">
        <h3>Publish Academic Materials</h3>
        <form onSubmit={handleFacultyPostNote} style={{ maxWidth: '500px', marginTop: '16px' }}>
          <div className="form-group"><label>Document Title</label><input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Lecture notes reference..." required /></div>
          <div className="form-group" style={{ marginTop: '12px' }}><label>Subject Stream</label>
            <select value={noteSubject} onChange={e => setNoteSubject(e.target.value)}>{dbData.subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}><label>Upload File</label><input type="file" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} style={{ border: '1px dashed #ccc', width: '100%', padding: '10px' }} /></div>
          <button type="submit" className="submit-btn" style={{ marginTop: '20px' }}>Publish Document</button>
        </form>
      </div>
    );
  }

  return null;
}