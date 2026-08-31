import React, { useState, useEffect } from 'react';
import {
  Layers,
  Settings,
  Calendar,
  Loader2,
  Users,
  UserCheck,
  FileClock,
  BookOpen,
  ClipboardList,
  ShieldAlert,
  Eye,
  EyeOff,
  ScanFace
} from 'lucide-react';

import { io } from 'socket.io-client';
import './App.css';

import NotificationDrawer from './components/NotificationDrawer';
import AdminPanel from './components/AdminPanel';
import FacultyPanel from './components/FacultyPanel';
import StudentPanel from './components/StudentPanel';

const socket = io('http://localhost:5000', {
  autoConnect: false
});

export default function App() {
  // =========================================================
  // SESSION / LOGIN STATE
  // =========================================================

  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [currentView, setCurrentView] = useState('');

  // =========================================================
  // PASSWORD VISIBILITY
  // =========================================================

  const [showLoginPass, setShowLoginPass] = useState(false);

  const [showProfileCurrentPass, setShowProfileCurrentPass] =
    useState(false);

  const [showProfileNewPass, setShowProfileNewPass] =
    useState(false);

  const [showProfileConfirmPass, setShowProfileConfirmPass] =
    useState(false);

  const [profilePassword, setProfilePassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [isUpdatingPassword, setIsUpdatingPassword] =
    useState(false);

  // =========================================================
  // ERP DATA
  // =========================================================

  const [dbData, setDbData] = useState<any>({
    subjects: [],
    studentRecords: [],
    sharedNotes: [],
    leaveRequests: [],
    facultyList: [],
    assignments: [],
    attendanceLogs: []
  });

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem('erp_session_token');
    localStorage.removeItem('erp_user_profile');

    setSession(null);
    setCurrentView('');

    socket.disconnect();
  };

  // =========================================================
  // RESTORE PREVIOUS SESSION
  // =========================================================

  useEffect(() => {
    const savedToken =
      localStorage.getItem('erp_session_token');

    const savedUser =
      localStorage.getItem('erp_user_profile');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        setSession(parsedUser);

        if (parsedUser.role === 'admin') {
          setCurrentView('admin-addStudent');
        } else if (parsedUser.role === 'faculty') {
          setCurrentView('faculty-mark');
        } else {
          setCurrentView('student-ai-insights');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);

        localStorage.removeItem('erp_session_token');
        localStorage.removeItem('erp_user_profile');
      }
    }
  }, []);

  // =========================================================
  // FETCH ERP DATA
  // =========================================================

  const fetchERPData = () => {
    const currentToken =
      localStorage.getItem('erp_session_token');

    if (!currentToken) return;

    setIsDataLoading(true);

    fetch('http://localhost:5000/api/dashboard-data', {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Expired session.');
        }

        return res.json();
      })
      .then(data => {
        setDbData(data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  };

  // =========================================================
  // SOCKET / REAL-TIME UPDATES
  // =========================================================

  useEffect(() => {
    if (!session) return;

    fetchERPData();

    socket.connect();

    // Register current user with socket server
    socket.emit(
      'register_user',
      session.username
    );

    // New notification
    socket.on(
      'new_notification',
      (notification) => {
        alert(
          `🔔 [${notification.title}]: ${notification.message}`
        );

        fetchERPData();
      }
    );

    // Dashboard mutation
    socket.on(
      'dashboard_mutation',
      (updatedMetrics) => {
        setDbData(updatedMetrics);
      }
    );

    return () => {
      socket.off('new_notification');
      socket.off('dashboard_mutation');
      socket.disconnect();
    };
  }, [session]);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    setLoginError('');

    fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(
            'Invalid access parameters.'
          );
        }

        return res.json();
      })
      .then(data => {
        if (data.success && data.token) {
          localStorage.setItem(
            'erp_session_token',
            data.token
          );

          localStorage.setItem(
            'erp_user_profile',
            JSON.stringify(data.user)
          );

          setSession(data.user);

          // Redirect based on role
          if (data.user.role === 'admin') {
            setCurrentView('admin-addStudent');
          } else if (data.user.role === 'faculty') {
            setCurrentView('faculty-mark');
          } else {
            setCurrentView('student-ai-insights');
          }
        } else {
          setLoginError(
            data.message || 'Login failed.'
          );
        }
      })
      .catch(err => {
        setLoginError(err.message);
      });
  };

  // =========================================================
  // UPDATE PASSWORD
  // =========================================================

  const handleUpdatePassword = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      profilePassword.new !==
      profilePassword.confirm
    ) {
      alert('❌ Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    fetch(
      'http://localhost:5000/api/user/update-password',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            `Bearer ${localStorage.getItem(
              'erp_session_token'
            )}`
        },
        body: JSON.stringify({
          username: session?.username,
          currentPassword:
            profilePassword.current,
          newPassword:
            profilePassword.new
        })
      }
    )
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('🔒 Password updated.');

          setProfilePassword({
            current: '',
            new: '',
            confirm: ''
          });
        } else {
          alert(
            `❌ Error: ${data.message}`
          );
        }
      })
      .catch(err => {
        console.error(err);
        alert('❌ Failed to update password.');
      })
      .finally(() => {
        setIsUpdatingPassword(false);
      });
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const exportTableToCSV = (
    datasetType:
      | 'students'
      | 'attendance'
      | 'leaves'
  ) => {
    let csvContent = '';

    const fileName =
      `${datasetType}_report.csv`;

    if (datasetType === 'students') {
      csvContent +=
        'Student ID,Full Name,Section\n';

      dbData.studentRecords.forEach(
        (s: any) => {
          csvContent +=
            `"${s.id}","${s.name}","${s.section}"\n`;
        }
      );
    }

    if (datasetType === 'attendance') {
      csvContent +=
        'Student ID,Subject,Date,Status\n';

      if (dbData.attendanceLogs) {
        dbData.attendanceLogs.forEach(
          (a: any) => {
            csvContent +=
              `"${a.student_id || a.studentId || ''}",` +
              `"${a.subject_name || a.subject || ''}",` +
              `"${a.date || ''}",` +
              `"${a.status || ''}"\n`;
          }
        );
      }
    }

    if (datasetType === 'leaves') {
      csvContent +=
        'Student ID,Reason,Start Date,End Date,Status\n';

      if (dbData.leaveRequests) {
        dbData.leaveRequests.forEach(
          (leave: any) => {
            csvContent +=
              `"${leave.studentId || ''}",` +
              `"${leave.reason || ''}",` +
              `"${leave.startDate || ''}",` +
              `"${leave.endDate || ''}",` +
              `"${leave.status || ''}"\n`;
          }
        );
      }
    }

    const blob = new Blob(
      [csvContent],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.setAttribute(
      'href',
      url
    );

    link.setAttribute(
      'download',
      fileName
    );

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================================================
  // LOGIN PAGE
  // =========================================================

  if (!session) {
    return (
      <div className="login-page-container">
        <div className="login-card-split">

          <div className="login-form-side">
            <div className="login-form-content">

              <h2>Login</h2>

              {loginError && (
                <div className="login-err-banner">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin}>

                <div className="input-field-group">
                  <input
                    type="text"
                    value={username}
                    onChange={e =>
                      setUsername(
                        e.target.value
                      )
                    }
                    required
                    placeholder="Username"
                  />
                </div>

                <div className="input-field-group password-toggle-wrapper">

                  <input
                    type={
                      showLoginPass
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={e =>
                      setPassword(
                        e.target.value
                      )
                    }
                    required
                    placeholder="Password"
                  />

                  <button
                    type="button"
                    className="password-visibility-btn"
                    onClick={() =>
                      setShowLoginPass(
                        !showLoginPass
                      )
                    }
                  >
                    {showLoginPass ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

                <button
                  type="submit"
                  className="signin-btn"
                >
                  Login
                </button>

              </form>

            </div>
          </div>

          <div className="login-banner-side">
            <div className="banner-text-content">
              <h1>
                Welcome to student portal
              </h1>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // PENDING LEAVE COUNT
  // =========================================================

  const pendingLeavesCount =
    dbData.leaveRequests.filter(
      (r: any) =>
        r.status === 'Pending'
    ).length;

  // =========================================================
  // MAIN ERP PAGE
  // =========================================================

  return (
    <div className="erp-container">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="erp-sidebar">

        <div className="erp-logo">

          <Layers
            size={28}
            color="#a78bfa"
          />

          <h2>
            STUDENT PORTAL
          </h2>

        </div>

        <nav className="erp-nav">

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >

            {/* =================================================
                STUDENT MENU
            ================================================= */}

            {session.role === 'student' && (
              <>

                <button
                  className={
                    currentView ===
                    'student-ai-insights'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'student-ai-insights'
                    )
                  }
                >
                  <Calendar size={18} />
                  AI Insights
                </button>

                <button
                  className={
                    currentView ===
                    'student-logs'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'student-logs'
                    )
                  }
                >
                  <ClipboardList
                    size={18}
                  />
                  Attendance Logs
                </button>

                <button
                  className={
                    currentView ===
                    'student-notes'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'student-notes'
                    )
                  }
                >
                  <BookOpen size={18} />
                  Lecture Notes
                </button>

                <button
                  className={
                    currentView ===
                    'student-leave'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'student-leave'
                    )
                  }
                >
                  <ShieldAlert
                    size={18}
                  />
                  Leave Operations
                </button>

              </>
            )}

            {/* =================================================
                FACULTY MENU
            ================================================= */}

            {session.role === 'faculty' && (
              <>

                {/* Manual Roll Call */}

                <button
                  className={
                    currentView ===
                    'faculty-mark'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'faculty-mark'
                    )
                  }
                >
                  <UserCheck size={18} />
                  Roll Call
                </button>

                {/* =================================================
                    NEW: FACE ATTENDANCE
                ================================================= */}

                <button
                  className={
                    currentView ===
                    'faculty-face-attendance'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'faculty-face-attendance'
                    )
                  }
                >
                  <ScanFace size={18} />
                  Face Attendance
                </button>

                {/* Faculty Leaves */}

                <button
                  className={
                    currentView ===
                    'faculty-leaves'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'faculty-leaves'
                    )
                  }
                >
                  <FileClock size={18} />
                  Leaves ({pendingLeavesCount})
                </button>

                {/* Publish Notes */}

                <button
                  className={
                    currentView ===
                    'faculty-notes'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'faculty-notes'
                    )
                  }
                >
                  <BookOpen size={18} />
                  Publish Notes
                </button>

              </>
            )}

            {/* =================================================
                ADMIN MENU
            ================================================= */}

            {session.role === 'admin' && (
              <>

                {/* Onboard Student */}

                <button
                  className={
                    currentView ===
                    'admin-addStudent'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'admin-addStudent'
                    )
                  }
                >
                  <Users size={18} />
                  Onboard Student
                </button>

                {/* Add Faculty */}

                <button
                  className={
                    currentView ===
                    'admin-addFaculty'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'admin-addFaculty'
                    )
                  }
                >
                  <UserCheck size={18} />
                  Add Faculty
                </button>

                {/* Section Allocation */}

                <button
                  className={
                    currentView ===
                    'admin-assignFaculty'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCurrentView(
                      'admin-assignFaculty'
                    )
                  }
                >
                  <Settings size={18} />
                  Section Allocation
                </button>

              </>
            )}

          </div>

          {/* =================================================
              BOTTOM MENU
          ================================================= */}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: 'auto',
              paddingBottom: '20px'
            }}
          >

            <button
              className={`profile-settings-nav-btn ${
                currentView === 'profile'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setCurrentView('profile')
              }
            >
              <Settings size={18} />
              Account Settings
            </button>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Log Out
            </button>

          </div>

        </nav>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="erp-main">

        <header className="erp-header">

          <div>

            <h1>
              Welcome, {session.name}
            </h1>

            <div className="user-profile-badge">
              ROLE: {
                session.role.toUpperCase()
              }
            </div>

          </div>

          <NotificationDrawer
            currentUser={{
              username:
                session.username,
              role:
                session.role
            }}
          />

        </header>

        {/* =================================================
            LOADING
        ================================================= */}

        {isDataLoading ? (

          <div className="loading-container">

            <Loader2
              className="animate-spin"
              size={32}
              color="#8b5cf6"
            />

          </div>

        ) : (

          <div className="view-content-wrapper">

            {/* =================================================
                ADMIN PANEL
            ================================================= */}

            <AdminPanel
              dbData={dbData}
              currentView={currentView}
              fetchERPData={fetchERPData}
              exportTableToCSV={
                exportTableToCSV
              }
            />

            {/* =================================================
                FACULTY PANEL

                Important:
                FacultyPanel must handle:

                faculty-mark
                faculty-face-attendance
                faculty-leaves
                faculty-notes
            ================================================= */}

            <FacultyPanel
              dbData={dbData}
              currentView={currentView}
              fetchERPData={fetchERPData}
              exportTableToCSV={
                exportTableToCSV
              }
            />

            {/* =================================================
                STUDENT PANEL
            ================================================= */}

            <StudentPanel
              dbData={dbData}
              currentView={currentView}
              session={session}
              fetchERPData={fetchERPData}
            />

            {/* =================================================
                PROFILE
            ================================================= */}

            {currentView === 'profile' && (

              <div
                className="animate-fade"
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 2fr',
                  gap: '24px',
                  alignItems: 'start'
                }}
              >

                {/* Profile Information */}

                <div
                  className="panel"
                  style={{
                    textAlign: 'center',
                    padding: '24px'
                  }}
                >

                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background:
                        '#f3e8ff',
                      color:
                        '#7c3aed',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      margin:
                        '0 auto 16px auto',
                      fontSize: '28px',
                      fontWeight: 'bold'
                    }}
                  >
                    {session.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <h3>
                    {session.name}
                  </h3>

                  <p>
                    @{session.username}
                  </p>

                  <div
                    className="user-profile-badge"
                    style={{
                      display: 'inline-block',
                      marginTop: '8px'
                    }}
                  >
                    ROLE: {
                      session.role.toUpperCase()
                    }
                  </div>

                </div>

                {/* Password Update */}

                <div
                  className="panel"
                  style={{
                    padding: '24px'
                  }}
                >

                  <h3>
                    Re-Encrypt Security Keys
                  </h3>

                  <form
                    onSubmit={
                      handleUpdatePassword
                    }
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '16px'
                    }}
                  >

                    {/* Current Password */}

                    <div className="form-group">

                      <label>
                        Current Password
                      </label>

                      <div className="password-toggle-wrapper">

                        <input
                          type={
                            showProfileCurrentPass
                              ? 'text'
                              : 'password'
                          }
                          required
                          value={
                            profilePassword.current
                          }
                          onChange={e =>
                            setProfilePassword({
                              ...profilePassword,
                              current:
                                e.target.value
                            })
                          }
                        />

                        <button
                          type="button"
                          className="password-visibility-btn"
                          onClick={() =>
                            setShowProfileCurrentPass(
                              !showProfileCurrentPass
                            )
                          }
                        >
                          {showProfileCurrentPass ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>

                      </div>

                    </div>

                    {/* New Password */}

                    <div className="form-group">

                      <label>
                        New Password
                      </label>

                      <div className="password-toggle-wrapper">

                        <input
                          type={
                            showProfileNewPass
                              ? 'text'
                              : 'password'
                          }
                          required
                          value={
                            profilePassword.new
                          }
                          onChange={e =>
                            setProfilePassword({
                              ...profilePassword,
                              new:
                                e.target.value
                            })
                          }
                        />

                        <button
                          type="button"
                          className="password-visibility-btn"
                          onClick={() =>
                            setShowProfileNewPass(
                              !showProfileNewPass
                            )
                          }
                        >
                          {showProfileNewPass ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>

                      </div>

                    </div>

                    {/* Confirm Password */}

                    <div className="form-group">

                      <label>
                        Confirm Password
                      </label>

                      <div className="password-toggle-wrapper">

                        <input
                          type={
                            showProfileConfirmPass
                              ? 'text'
                              : 'password'
                          }
                          required
                          value={
                            profilePassword.confirm
                          }
                          onChange={e =>
                            setProfilePassword({
                              ...profilePassword,
                              confirm:
                                e.target.value
                            })
                          }
                        />

                        <button
                          type="button"
                          className="password-visibility-btn"
                          onClick={() =>
                            setShowProfileConfirmPass(
                              !showProfileConfirmPass
                            )
                          }
                        >
                          {showProfileConfirmPass ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>

                      </div>

                    </div>

                    <button
                      type="submit"
                      disabled={
                        isUpdatingPassword
                      }
                      className="submit-btn"
                    >
                      {isUpdatingPassword
                        ? 'Updating...'
                        : 'Update Security State'}
                    </button>

                  </form>

                </div>

              </div>

            )}

          </div>

        )}

      </main>

    </div>
  );
}