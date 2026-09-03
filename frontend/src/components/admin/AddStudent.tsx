import React, { useState } from 'react';
import {
  PlusCircle,
  Search,
  Trash2,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react';

import { StudentMetadata } from '../../types';

interface AddStudentProps {
  studentRecords: StudentMetadata[];
  fetchERPData: () => void;
  exportTableToCSV: (
    datasetType: 'students' | 'attendance' | 'leaves'
  ) => void;
}

export default function AddStudent({
  studentRecords,
  fetchERPData,
  exportTableToCSV
}: AddStudentProps) {
  const [showAdminAddPass, setShowAdminAddPass] =
    useState(false);

  const [globalSearchQuery, setGlobalSearchQuery] =
    useState('');

  const [sectionFilter, setSectionFilter] =
    useState('ALL');

  const [isSendingAlerts, setIsSendingAlerts] =
    useState(false);

  const [newStudent, setNewStudent] = useState({
    id: '',
    name: '',
    user: '',
    pass: '',
    cohort: '2026',
    section: 'A',
    email: '',
    parentPhone: ''
  });

  const handleAddStudent = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const token =
      localStorage.getItem('erp_session_token');

    fetch(
      'http://localhost:5000/api/admin/add-student',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      }
    )
      .then((res) => res.json())
      .then(() => {
        alert(
          `Student profile ${newStudent.name} registered.`
        );

        setNewStudent({
          id: '',
          name: '',
          user: '',
          pass: '',
          cohort: '2026',
          section: 'A',
          email: '',
          parentPhone: ''
        });

        fetchERPData();
      });
  };

  const handleDeleteStudent = (
    studentId: string
  ) => {
    if (
      !window.confirm(
        '⚠️ WARNING: Purging student clears related datasets.'
      )
    ) {
      return;
    }

    const token =
      localStorage.getItem('erp_session_token');

    fetch(
      `http://localhost:5000/api/admin/student/${studentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert('Student profile deleted.');
          fetchERPData();
        } else {
          alert(`Failed: ${data.message}`);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleTriggerParentAlerts = () => {
    const confirmAction = window.confirm(
      'Are you sure you want to scan all student profiles and send low attendance SMS alerts to parents?'
    );

    if (!confirmAction) {
      return;
    }

    setIsSendingAlerts(true);

    const token =
      localStorage.getItem('erp_session_token');

    fetch(
      'http://localhost:5000/api/admin/trigger-parent-alerts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(
            `🎉 Success! Found and dispatched alerts to ${data.alertsSent} parents.`
          );
        } else {
          alert(`Failed: ${data.message}`);
        }
      })
      .catch((err) => {
        console.error(err);
        alert(
          'An error occurred while executing the background data sweep.'
        );
      })
      .finally(() => {
        setIsSendingAlerts(false);
      });
  };

  const filteredStudents =
    studentRecords.filter((student) => {
      const query =
        globalSearchQuery.toLowerCase();

      const matchesSearch =
        student.name
          .toLowerCase()
          .includes(query) ||
        student.id
          .toLowerCase()
          .includes(query);

      const matchesSection =
        sectionFilter === 'ALL' ||
        student.section === sectionFilter;

      return (
        matchesSearch &&
        matchesSection
      );
    });

  return (
    <div className="panel animate-fade">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}
      >
        <h3>
          Onboard New Student Profile
        </h3>

        <button
          onClick={() =>
            exportTableToCSV('students')
          }
          className="download-action-btn present-text"
          style={{
            padding: '8px 14px',
            background: '#ecfdf5',
            borderRadius: '8px',
            border: '1px solid #a7f3d0',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          <FileSpreadsheet
            size={16}
            style={{ marginRight: '6px' }}
          />
          Export Registry
        </button>
      </div>

      <form onSubmit={handleAddStudent}>
        <div className="form-row">
          <div className="form-group">
            <label>
              Student ID
            </label>

            <input
              type="text"
              value={newStudent.id}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  id: e.target.value
                })
              }
              placeholder="S103"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Full Name
            </label>

            <input
              type="text"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  name: e.target.value
                })
              }
              placeholder="Marcus Aurelius"
              required
            />
          </div>
        </div>

        <div
          className="form-row"
          style={{ marginTop: '12px' }}
        >
          <div className="form-group">
            <label>
              Portal Username
            </label>

            <input
              type="text"
              value={newStudent.user}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  user: e.target.value
                })
              }
              placeholder="marcus"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Password
            </label>

            <div className="password-toggle-wrapper">
              <input
                type={
                  showAdminAddPass
                    ? 'text'
                    : 'password'
                }
                value={newStudent.pass}
                onChange={(e) =>
                  setNewStudent({
                    ...newStudent,
                    pass: e.target.value
                  })
                }
                placeholder="••••••••"
                required
              />

              <button
                type="button"
                className="password-visibility-btn"
                onClick={() =>
                  setShowAdminAddPass(
                    !showAdminAddPass
                  )
                }
              >
                {showAdminAddPass ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          className="form-row"
          style={{ marginTop: '12px' }}
        >
          <div className="form-group">
            <label>
              Year
            </label>

            <input
              type="text"
              value={newStudent.cohort}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  cohort: e.target.value
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>
              Section
            </label>

            <select
              value={newStudent.section}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  section: e.target.value
                })
              }
            >
              <option value="A">
                Section A
              </option>

              <option value="B">
                Section B
              </option>

              <option value="C">
                Section C
              </option>
            </select>
          </div>
        </div>

        <div
          className="form-row"
          style={{ marginTop: '12px' }}
        >
          <div className="form-group">
            <label>
              Institutional Email
            </label>

            <input
              type="email"
              value={newStudent.email}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  email: e.target.value
                })
              }
              placeholder="name@university.edu"
              required
            />
          </div>

          <div className="form-group">
            <label>
              Parent Phone (E.164 Standard)
            </label>

            <input
              type="text"
              value={newStudent.parentPhone}
              onChange={(e) =>
                setNewStudent({
                  ...newStudent,
                  parentPhone: e.target.value
                })
              }
              placeholder="+919876543210"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{ marginTop: '20px' }}
        >
          <PlusCircle size={16} />
          Register Student
        </button>
      </form>

      <hr
        style={{
          margin: '30px 0',
          border: '0',
          borderTop:
            '1px solid #e5e7eb'
        }}
      />

      <div
        style={{
          padding: '20px',
          background: '#fff5f5',
          border: '1px solid #feb2b2',
          borderRadius: '8px',
          marginBottom: '30px'
        }}
      >
        <h4
          style={{
            color: '#9b2c2c',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Smartphone size={18} />
          Automated Performance &
          Compliance Controls
        </h4>

        <p
          style={{
            color: '#742a2a',
            fontSize: '13px',
            margin: '0 0 16px 0'
          }}
        >
          Initiate a comprehensive
          attendance verification index
          sweep across all registered
          active sections. The engine
          computes performance layers
          and dispatches urgent warning
          SMS alerts to the registered
          guardians of students below
          75%.
        </p>

        <button
          type="button"
          onClick={
            handleTriggerParentAlerts
          }
          disabled={isSendingAlerts}
          className="submit-btn"
          style={{
            background: isSendingAlerts
              ? '#718096'
              : '#e53e3e',
            color: '#fff',
            border: 'none'
          }}
        >
          {isSendingAlerts
            ? 'Processing Scans & Dispatches...'
            : '⚠️ Broadcast Low Attendance SMS Alerts'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative'
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform:
                'translateY(-50%)',
              color: '#9ca3af'
            }}
          />

          <input
            type="text"
            placeholder="Search data index..."
            value={globalSearchQuery}
            onChange={(e) =>
              setGlobalSearchQuery(
                e.target.value
              )
            }
            style={{
              width: '100%',
              padding:
                '10px 10px 10px 40px',
              borderRadius: '8px',
              border:
                '1px solid #d1d5db'
            }}
          />
        </div>

        <select
          value={sectionFilter}
          onChange={(e) =>
            setSectionFilter(
              e.target.value
            )
          }
          style={{
            padding: '10px',
            borderRadius: '8px',
            border:
              '1px solid #d1d5db'
          }}
        >
          <option value="ALL">
            All Sections
          </option>

          <option value="A">
            Section A
          </option>

          <option value="B">
            Section B
          </option>

          <option value="C">
            Section C
          </option>
        </select>
      </div>

      <table className="erp-table">
        <thead>
          <tr>
            <th>ID Reference</th>
            <th>Identity Name</th>
            <th>Section</th>
            <th
              style={{
                textAlign: 'right'
              }}
            >
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.map(
            (student) => (
              <tr key={student.id}>
                <td>
                  <code>
                    {student.id}
                  </code>
                </td>

                <td>
                  <strong>
                    {student.name}
                  </strong>
                </td>

                <td>
                  <span className="status-pill pending">
                    Section{' '}
                    {student.section}
                  </span>
                </td>

                <td
                  style={{
                    textAlign: 'right'
                  }}
                >
                  <button
                    onClick={() =>
                      handleDeleteStudent(
                        student.id
                      )
                    }
                    className="download-action-btn absent-text"
                    style={{
                      border: 'none',
                      background:
                        'transparent'
                    }}
                  >
                    <Trash2 size={14} />
                    Purge
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}