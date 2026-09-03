import React, { useState } from 'react';
import { PlusCircle, Search, Trash2, FileSpreadsheet, Eye, EyeOff, Smartphone } from 'lucide-react';

interface StudentMetadata { id: string; name: string; section: string; email?: string; }
interface FacultyMember { faculty_id: number; username: string; name: string; }
interface Assignment { id: number; section: string; subject_name: string; faculty_username: string; }
interface ERPDashboardData { subjects: string[]; studentRecords: StudentMetadata[]; sharedNotes: any[]; leaveRequests: any[]; facultyList?: FacultyMember[]; assignments?: Assignment[]; }

interface AdminPanelProps {
  dbData: ERPDashboardData;
  currentView: string;
  fetchERPData: () => void;
  exportTableToCSV: (datasetType: 'students' | 'attendance' | 'leaves') => void;
}

export default function AdminPanel({ dbData, currentView, fetchERPData, exportTableToCSV }: AdminPanelProps) {
  const [showAdminAddPass, setShowAdminAddPass] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [isSendingAlerts, setIsSendingAlerts] = useState(false);
  
  // Updated state initialization to include parentPhone string
  const [newStudent, setNewStudent] = useState({ id: '', name: '', user: '', pass: '', cohort: '2026', section: 'A', email: '', parentPhone: '' });
  const [newFaculty, setNewFaculty] = useState({
  name: '',
  user: '',
  pass: ''
});
  const [newAssign, setNewAssign] = useState({ section: 'A', subject: 'Data Science', faculty: 'faculty1' });

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('erp_session_token');
    fetch('http://localhost:5000/api/admin/add-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      // Added parentPhone payload delivery configuration
      body: JSON.stringify({ 
        studentId: newStudent.id, 
        name: newStudent.name, 
        username: newStudent.user, 
        password: newStudent.pass, 
        classCohort: newStudent.cohort, 
        section: newStudent.section, 
        email: newStudent.email,
        parentPhone: newStudent.parentPhone
      })
    })
    .then(res => res.json()).then(() => {
      alert(`Student profile ${newStudent.name} registered.`);
      setNewStudent({ id: '', name: '', user: '', pass: '', cohort: '2026', section: 'A', email: '', parentPhone: '' });
      fetchERPData();
    });
  };

  const handleAddFaculty = (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem('erp_session_token');

  fetch('http://localhost:5000/api/admin/add-faculty', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: newFaculty.name,
      username: newFaculty.user,
      password: newFaculty.pass
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`Faculty ${newFaculty.name} registered successfully.`);

        setNewFaculty({
          name: '',
          user: '',
          pass: ''
        });

        fetchERPData();
      } else {
        alert(`Failed: ${data.message}`);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to create faculty account.");
    });
};

  const handleDeleteStudent = (studentId: string) => {
    if (!window.confirm("⚠️ WARNING: Purging student clears related datasets.")) return;
    const token = localStorage.getItem('erp_session_token');
    fetch(`http://localhost:5000/api/admin/student/${studentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json()).then(data => {
      if (data.success) { alert("Student profile deleted."); fetchERPData(); }
      else { alert(`Failed: ${data.message}`); }
    }).catch(err => console.error(err));
  };

  const handleAssignFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('erp_session_token');
    fetch('http://localhost:5000/api/admin/assign-faculty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ section: newAssign.section, subject: newAssign.subject, facultyUsername: newAssign.faculty })
    })
    .then(res => res.json()).then(() => { alert("Faculty mapping allocation updated."); fetchERPData(); });
  };

  // Automated Parent SMS Dispatch Function Handler
  const handleTriggerParentAlerts = () => {
    const confirmAction = window.confirm("Are you sure you want to scan all student profiles and send low attendance SMS alerts to parents?");
    if (!confirmAction) return;

    setIsSendingAlerts(true);
    const token = localStorage.getItem('erp_session_token');

    fetch('http://localhost:5000/api/admin/trigger-parent-alerts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`🎉 Success! Found and dispatched alerts to ${data.alertsSent} parents.`);
      } else {
        alert(`Failed: ${data.message}`);
      }
    })
    .catch(err => {
      console.error(err);
      alert("An error occurred while executing the background data sweep.");
    })
    .finally(() => {
      setIsSendingAlerts(false);
    });
  };

  const filteredStudents = dbData.studentRecords.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || student.id.toLowerCase().includes(globalSearchQuery.toLowerCase());
    const matchesSection = sectionFilter === 'ALL' || student.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  if (currentView === 'admin-addStudent') {
    return (
      <div className="panel animate-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3>Onboard New Student Profile</h3>
          <button onClick={() => exportTableToCSV('students')} className="download-action-btn present-text" style={{ padding: '8px 14px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px', fontWeight: '600' }}>
            <FileSpreadsheet size={16} style={{ marginRight: '6px' }} /> Export Registry
          </button>
        </div>
        <form onSubmit={handleAddStudent}>
          <div className="form-row">
            <div className="form-group"><label>Student ID</label><input type="text" value={newStudent.id} onChange={e => setNewStudent({...newStudent, id: e.target.value})} placeholder="S103" required /></div>
            <div className="form-group"><label>Full Name</label><input type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} placeholder="Marcus Aurelius" required /></div>
          </div>
          <div className="form-row" style={{ marginTop: '12px' }}>
            <div className="form-group"><label>Portal Username</label><input type="text" value={newStudent.user} onChange={e => setNewStudent({...newStudent, user: e.target.value})} placeholder="marcus" required /></div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-toggle-wrapper">
                <input type={showAdminAddPass ? "text" : "password"} value={newStudent.pass} onChange={e => setNewStudent({...newStudent, pass: e.target.value})} placeholder="••••••••" required />
                <button type="button" className="password-visibility-btn" onClick={() => setShowAdminAddPass(!showAdminAddPass)}>
                  {showAdminAddPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="form-row" style={{ marginTop: '12px' }}>
            <div className="form-group"><label>Year</label><input type="text" value={newStudent.cohort} onChange={e => setNewStudent({...newStudent, cohort: e.target.value})} required /></div>
            <div className="form-group"><label>Section</label>
              <select value={newStudent.section} onChange={e => setNewStudent({...newStudent, section: e.target.value})}>
                <option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option>
              </select>
            </div>
          </div>
          <div className="form-row" style={{ marginTop: '12px' }}>
            <div className="form-group"><label>Institutional Email</label><input type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} placeholder="name@university.edu" required /></div>
            {/* Added Form Field Entry point for Parent Contact Mapping */}
            <div className="form-group"><label>Parent Phone (E.164 Standard)</label><input type="text" value={newStudent.parentPhone} onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})} placeholder="+919876543210" required /></div>
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '20px' }}><PlusCircle size={16} /> Register Student</button>
        </form>

        <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid #e5e7eb' }} />
        
        {/* New System Automated Controls Section */}
        <div style={{ padding: '20px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', marginBottom: '30px' }}>
          <h4 style={{ color: '#9b2c2c', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} /> Automated Performance & Compliance Controls
          </h4>
          <p style={{ color: '#742a2a', fontSize: '13px', margin: '0 0 16px 0' }}>
            Initiate a comprehensive attendance verification index sweep across all registered active sections. The engine computes performance layers and dispatches urgent warning SMS alerts to the registered guardians of students below 75%.
          </p>
          <button 
            type="button" 
            onClick={handleTriggerParentAlerts} 
            disabled={isSendingAlerts}
            className="submit-btn" 
            style={{ background: isSendingAlerts ? '#718096' : '#e53e3e', color: '#fff', border: 'none' }}
          >
            {isSendingAlerts ? 'Processing Scans & Dispatches...' : '⚠️ Broadcast Low Attendance SMS Alerts'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input type="text" placeholder="Search data index..." value={globalSearchQuery} onChange={e => setGlobalSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
          </div>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}><option value="ALL">All Sections</option><option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option></select>
        </div>

        <table className="erp-table">
          <thead><tr><th>ID Reference</th><th>Identity Name</th><th>Section</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s.id}><td><code>{s.id}</code></td><td><strong>{s.name}</strong></td><td><span className="status-pill pending">Section {s.section}</span></td>
                <td style={{ textAlign: 'right' }}><button onClick={() => handleDeleteStudent(s.id)} className="download-action-btn absent-text" style={{ border: 'none', background: 'transparent' }}><Trash2 size={14} /> Purge</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (currentView === 'admin-addFaculty') {
  return (
    <div className="panel animate-fade">

      <h3>Add New Faculty Member</h3>

      <p style={{
        color: '#6b7280',
        fontSize: '13px',
        marginBottom: '24px'
      }}>
        Create a faculty profile and login credentials for the faculty portal.
      </p>

      <form onSubmit={handleAddFaculty} style={{ maxWidth: '500px' }}>

        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={newFaculty.name}
            onChange={e =>
              setNewFaculty({
                ...newFaculty,
                name: e.target.value
              })
            }
            placeholder="Dr. Ramesh Kumar"
            required
          />
        </div>

        <div
          className="form-group"
          style={{ marginTop: '16px' }}
        >
          <label>Faculty Username</label>
          <input
            type="text"
            value={newFaculty.user}
            onChange={e =>
              setNewFaculty({
                ...newFaculty,
                user: e.target.value
              })
            }
            placeholder="ramesh"
            required
          />
        </div>

        <div
          className="form-group"
          style={{ marginTop: '16px' }}
        >
          <label>Initial Password</label>

          <input
            type="password"
            value={newFaculty.pass}
            onChange={e =>
              setNewFaculty({
                ...newFaculty,
                pass: e.target.value
              })
            }
            placeholder="Enter initial password"
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{ marginTop: '20px' }}
        >
          <PlusCircle size={16} />
          Register Faculty
        </button>

      </form>

      <hr
        style={{
          margin: '30px 0',
          border: '0',
          borderTop: '1px solid #e5e7eb'
        }}
      />

      <h4>Registered Faculty</h4>

      <table
        className="erp-table"
        style={{ marginTop: '16px' }}
      >
        <thead>
          <tr>
            <th>Faculty ID</th>
            <th>Name</th>
            <th>Username</th>
          </tr>
        </thead>

        <tbody>
          {dbData.facultyList?.map(faculty => (
            <tr key={faculty.faculty_id}>
              <td>
                <code>{faculty.faculty_id}</code>
              </td>

              <td>
                <strong>{faculty.name}</strong>
              </td>

              <td>
                <code>{faculty.username}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

  if (currentView === 'admin-assignFaculty') {
    return (
      <div className="panel animate-fade">
        <h3>Course Allocation & Section Mappings</h3>
        <form onSubmit={handleAssignFaculty} style={{ maxWidth: '500px', marginTop: '16px' }}>
          <div className="form-group"><label>Target Section</label>
            <select value={newAssign.section} onChange={e => setNewAssign({...newAssign, section: e.target.value})}><option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option></select>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}><label>Academic Module</label>
            <select value={newAssign.subject} onChange={e => setNewAssign({...newAssign, subject: e.target.value})}>{dbData.subjects.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}><label>Faculty Instructor</label>
            <select value={newAssign.faculty} onChange={e => setNewAssign({...newAssign, faculty: e.target.value})}>{dbData.facultyList?.map(f => <option key={f.username} value={f.username}>{f.name}</option>)}</select>
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '20px' }}>Deploy Mapping</button>
        </form>
        <table className="erp-table" style={{ marginTop: '30px' }}>
          <thead><tr><th>Section</th><th>Course Subject</th><th>Responsible Faculty</th></tr></thead>
          <tbody>{dbData.assignments?.map(a => (<tr key={a.id}><td>Section {a.section}</td><td>{a.subject_name}</td><td><code>{a.faculty_username}</code></td></tr>))}</tbody>
        </table>
      </div>
    );
  }

  return null;
}