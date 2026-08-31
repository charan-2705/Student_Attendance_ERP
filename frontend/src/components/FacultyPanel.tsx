import React, { useState } from 'react';
import {
  UserCheck,
  FileClock,
  BookOpen,
  Check,
  X,
  FileSpreadsheet,
  Camera,
  Upload,
  Loader2,
  Users,
  AlertCircle
} from 'lucide-react';

interface StudentMetadata {
  id: string;
  name: string;
  section: string;
}

interface LeaveRequest {
  id: string;
  studentId: string;
  studentName?: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface ERPDashboardData {
  subjects: string[];
  studentRecords: StudentMetadata[];
  sharedNotes: any[];
  leaveRequests: LeaveRequest[];
  attendanceLogs?: any[];
}

interface Props {
  dbData: ERPDashboardData;
  currentView: string;
  fetchERPData: () => void;
  exportTableToCSV: (
    datasetType: 'students' | 'attendance' | 'leaves'
  ) => void;
}

export default function FacultyPanel({
  dbData,
  currentView,
  fetchERPData,
  exportTableToCSV
}: Props) {

  // ============================================================
  // NORMAL ATTENDANCE STATES
  // ============================================================

  const [selectedSubject, setSelectedSubject] =
    useState<string>('Data Science');

  const [attendanceDate, setAttendanceDate] =
    useState<string>(new Date().toISOString().split('T')[0]);

  const [attendanceRoll, setAttendanceRoll] =
    useState<Record<string, 'Present' | 'Absent'>>({});

  // ============================================================
  // FACE ATTENDANCE STATES
  // ============================================================

  const [faceAttendanceFile, setFaceAttendanceFile] =
    useState<File | null>(null);

  const [isFaceProcessing, setIsFaceProcessing] =
    useState(false);

  const [faceAttendanceResult, setFaceAttendanceResult] =
    useState<string[]>([]);

  const [faceFacesDetected, setFaceFacesDetected] =
    useState<number>(0);

  const [faceAttendanceMessage, setFaceAttendanceMessage] =
    useState('');

  // ============================================================
  // NOTES STATES
  // ============================================================

  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] =
    useState('Data Science');

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  // ============================================================
  // INITIALIZE NORMAL ATTENDANCE
  // ============================================================

  React.useEffect(() => {

    const initialRoll: Record<
      string,
      'Present' | 'Absent'
    > = {};

    dbData.studentRecords.forEach((student) => {
      initialRoll[student.id] = 'Present';
    });

    setAttendanceRoll((previous) =>
      Object.keys(previous).length === 0
        ? initialRoll
        : previous
    );

  }, [dbData.studentRecords]);

  // ============================================================
  // NORMAL MANUAL ATTENDANCE
  // ============================================================

  const submitAttendance = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    const token =
      localStorage.getItem('erp_session_token');

    const formattedRecords =
      Object.keys(attendanceRoll).map((id) => ({
        studentId: id,
        status: attendanceRoll[id]
      }));

    try {

      const response = await fetch(
        'http://localhost:5000/api/attendance/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subject: selectedSubject,
            date: attendanceDate,
            records: formattedRecords
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Attendance submission failed.'
        );
      }

      alert(
        'Roster logs securely committed.'
      );

      fetchERPData();

    } catch (error: any) {

      console.error(error);

      alert(
        `Failed to submit attendance: ${
          error.message
        }`
      );
    }
  };

  // ============================================================
  // FACE ATTENDANCE
  // ============================================================

  const processFaceAttendance = async () => {

    if (!faceAttendanceFile) {
      alert(
        'Please select a classroom image first.'
      );
      return;
    }

    if (dbData.studentRecords.length === 0) {
      alert(
        'No students are available in the current dashboard.'
      );
      return;
    }

    setIsFaceProcessing(true);
    setFaceAttendanceMessage('');
    setFaceAttendanceResult([]);
    setFaceFacesDetected(0);

    try {

      // --------------------------------------------------------
      // Send image to Python Face Recognition API
      // --------------------------------------------------------

      const formData = new FormData();

      formData.append(
        'image',
        faceAttendanceFile
      );

      const response = await fetch(
        'http://127.0.0.1:5001/recognize',
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {

        throw new Error(
          `Face recognition server returned ${response.status}`
        );
      }

      const result = await response.json();

      console.log(
        'Face recognition result:',
        result
      );

      // --------------------------------------------------------
      // Read recognized students
      // --------------------------------------------------------

      const recognizedStudents: string[] =
        result.recognized_students || [];

      setFaceFacesDetected(
        result.faces_detected || 0
      );

      setFaceAttendanceResult(
        recognizedStudents
      );

      // --------------------------------------------------------
      // Automatically construct attendance
      //
      // Recognized = Present
      // Not recognized = Absent
      // --------------------------------------------------------

      const automaticAttendance: Record<
        string,
        'Present' | 'Absent'
      > = {};

      dbData.studentRecords.forEach(
        (student) => {

          const normalizedStudentId =
            student.id.toUpperCase();

          const isRecognized =
            recognizedStudents.some(
              (recognizedId) =>
                String(recognizedId)
                  .replace(/^S/i, '')
                  .toUpperCase() ===
                String(normalizedStudentId)
                  .replace(/^S/i, '')
                  .toUpperCase()
            );

          automaticAttendance[
            student.id
          ] = isRecognized
            ? 'Present'
            : 'Absent';
        }
      );

      setAttendanceRoll(
        automaticAttendance
      );

      // --------------------------------------------------------
      // Display result
      // --------------------------------------------------------

      if (recognizedStudents.length === 0) {

        setFaceAttendanceMessage(
          'No registered students were recognized.'
        );

      } else {

        setFaceAttendanceMessage(
          `${recognizedStudents.length} registered student(s) recognized successfully.`
        );
      }

    } catch (error: any) {

      console.error(
        'Face attendance error:',
        error
      );

      setFaceAttendanceMessage(
        `Face recognition failed: ${
          error.message
        }`
      );

      alert(
        `Face recognition failed.\n\n${
          error.message
        }\n\nMake sure the Python server is running on port 5001.`
      );

    } finally {

      setIsFaceProcessing(false);
    }
  };

  // ============================================================
  // COMMIT FACE ATTENDANCE
  // ============================================================

  const commitFaceAttendance = async () => {

    if (faceAttendanceResult.length === 0) {

      alert(
        'No recognized students found. Process an image first.'
      );

      return;
    }

    const token =
      localStorage.getItem('erp_session_token');

    const formattedRecords =
      Object.keys(attendanceRoll).map((id) => ({
        studentId: id,
        status: attendanceRoll[id]
      }));

    try {

      const response = await fetch(
        'http://localhost:5000/api/attendance/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subject: selectedSubject,
            date: attendanceDate,
            records: formattedRecords
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to commit face attendance.'
        );
      }

      alert(
        `Face attendance committed successfully.\n\nRecognized: ${faceAttendanceResult.length}\nFaces detected: ${faceFacesDetected}`
      );

      fetchERPData();

    } catch (error: any) {

      console.error(error);

      alert(
        `Failed to commit attendance: ${
          error.message
        }`
      );
    }
  };

  // ============================================================
  // FACULTY LEAVE ACTION
  // ============================================================

  const handleFacultyLeaveAction = async (
    leaveId: string,
    status: 'Approved' | 'Rejected'
  ) => {

    const token =
      localStorage.getItem('erp_session_token');

    try {

      const response = await fetch(
        'http://localhost:5000/api/faculty/leave-action',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            leaveId,
            status
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          'Leave action failed.'
        );
      }

      alert(
        `Leave application resolved: ${status}`
      );

      fetchERPData();

    } catch (error: any) {

      console.error(error);

      alert(
        `Failed: ${error.message}`
      );
    }
  };

  // ============================================================
  // FACULTY NOTES
  // ============================================================

  const handleFacultyPostNote = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    const token =
      localStorage.getItem('erp_session_token');

    const formData = new FormData();

    formData.append(
      'title',
      noteTitle
    );

    formData.append(
      'subject',
      noteSubject
    );

    if (selectedFile) {

      formData.append(
        'attachedFile',
        selectedFile
      );
    }

    try {

      const response = await fetch(
        'http://localhost:5000/api/faculty/post-note',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        throw new Error(
          data.message ||
          'Failed to publish document.'
        );
      }

      alert(
        'Academic file shared successfully.'
      );

      setNoteTitle('');
      setSelectedFile(null);

      fetchERPData();

    } catch (error: any) {

      console.error(error);

      alert(
        `Failed to publish document: ${
          error.message
        }`
      );
    }
  };

  // ============================================================
  // FACE ATTENDANCE VIEW
  // ============================================================

  if (currentView === 'faculty-face-attendance') {

    return (
      <div className="panel animate-fade">

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <Camera size={28} />

          <div>
            <h3 style={{ margin: 0 }}>
              Face Attendance
            </h3>

            <p
              style={{
                margin: '5px 0 0',
                color: '#6b7280',
                fontSize: '13px'
              }}
            >
              Upload a classroom photo to automatically
              identify registered students.
            </p>
          </div>
        </div>

        {/* ----------------------------------------------------
            SUBJECT + DATE
        ----------------------------------------------------- */}

        <div className="form-row">

          <div className="form-group">

            <label>
              Course Module
            </label>

            <select
              value={selectedSubject}
              onChange={(e) =>
                setSelectedSubject(
                  e.target.value
                )
              }
            >
              {dbData.subjects.map(
                (subject) => (
                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="form-group">

            <label>
              Attendance Date
            </label>

            <input
              type="date"
              value={attendanceDate}
              onChange={(e) =>
                setAttendanceDate(
                  e.target.value
                )
              }
              required
            />

          </div>

        </div>

        {/* ----------------------------------------------------
            IMAGE UPLOAD
        ----------------------------------------------------- */}

        <div
          style={{
            marginTop: '20px',
            padding: '30px',
            border: '2px dashed #c4b5fd',
            borderRadius: '12px',
            textAlign: 'center',
            background: '#faf5ff'
          }}
        >

          <Upload
            size={36}
            style={{
              marginBottom: '10px'
            }}
          />

          <h4>
            Upload Classroom Photograph
          </h4>

          <p
            style={{
              color: '#6b7280',
              fontSize: '13px'
            }}
          >
            The system will detect faces and compare
            them against registered face embeddings.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {

              const file =
                e.target.files?.[0] ||
                null;

              setFaceAttendanceFile(
                file
              );

              setFaceAttendanceResult(
                []
              );

              setFaceAttendanceMessage(
                ''
              );

            }}
            style={{
              marginTop: '12px'
            }}
          />

          {faceAttendanceFile && (

            <p
              style={{
                marginTop: '12px',
                fontSize: '13px'
              }}
            >
              Selected file:{' '}
              <strong>
                {faceAttendanceFile.name}
              </strong>
            </p>

          )}

        </div>

        {/* ----------------------------------------------------
            PROCESS BUTTON
        ----------------------------------------------------- */}

        <button
          type="button"
          onClick={processFaceAttendance}
          disabled={
            isFaceProcessing ||
            !faceAttendanceFile
          }
          className="submit-btn"
          style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >

          {isFaceProcessing ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />

              Processing Faces...
            </>
          ) : (
            <>
              <Camera size={17} />

              Detect & Mark Attendance
            </>
          )}

        </button>

        {/* ----------------------------------------------------
            RECOGNITION RESULT
        ----------------------------------------------------- */}

        {faceAttendanceMessage && (

          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: '8px',
              background:
                faceAttendanceResult.length > 0
                  ? '#ecfdf5'
                  : '#fff7ed',
              border:
                '1px solid ' +
                (
                  faceAttendanceResult.length > 0
                    ? '#a7f3d0'
                    : '#fed7aa'
                )
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >

              {faceAttendanceResult.length > 0 ? (
                <Check size={18} />
              ) : (
                <AlertCircle size={18} />
              )}

              <strong>
                {faceAttendanceMessage}
              </strong>

            </div>

            <p
              style={{
                margin:
                  '8px 0 0',
                fontSize: '13px'
              }}
            >
              Faces detected:{' '}
              <strong>
                {faceFacesDetected}
              </strong>
            </p>

          </div>

        )}

        {/* ----------------------------------------------------
            RECOGNIZED STUDENTS
        ----------------------------------------------------- */}

        {faceAttendanceResult.length > 0 && (

          <div
            style={{
              marginTop: '20px'
            }}
          >

            <h4
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >

              <Users size={18} />

              Recognized Students

            </h4>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >

              {faceAttendanceResult.map(
                (studentId) => {

                  const student =
                    dbData.studentRecords.find(
                      (s) =>
                        s.id.toUpperCase() ===
                        studentId.toUpperCase()
                    );

                  return (
                    <span
                      key={studentId}
                      className="status-pill present"
                    >
                      ✓ {studentId}
                      {student
                        ? ` - ${student.name}`
                        : ''}
                    </span>
                  );

                }
              )}

            </div>

          </div>

        )}

        {/* ----------------------------------------------------
            AUTOMATIC ATTENDANCE TABLE
        ----------------------------------------------------- */}

        {faceAttendanceResult.length > 0 && (

          <div
            style={{
              marginTop: '30px'
            }}
          >

            <h4>
              Automatic Attendance Preview
            </h4>

            <table className="erp-table">

              <thead>

                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Attendance Status</th>
                </tr>

              </thead>

              <tbody>

                {dbData.studentRecords.map(
                  (student) => (

                    <tr key={student.id}>

                      <td>
                        <code>
                          {student.id}
                        </code>
                      </td>

                      <td>
                        {student.name}
                      </td>

                      <td>

                        {attendanceRoll[
                          student.id
                        ] === 'Present' ? (

                          <span className="status-pill present">
                            <Check
                              size={14}
                            />
                            Present
                          </span>

                        ) : (

                          <span className="status-pill absent">
                            <X
                              size={14}
                            />
                            Absent
                          </span>

                        )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

            <button
              type="button"
              onClick={
                commitFaceAttendance
              }
              className="submit-btn"
              style={{
                marginTop: '20px'
              }}
            >
              <Check size={16} />

              Commit Face Attendance

            </button>

          </div>

        )}

      </div>
    );
  }

  // ============================================================
  // NORMAL ROLL CALL VIEW
  // ============================================================

  if (currentView === 'faculty-mark') {

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
            Roll Call Manager
          </h3>

          <button
            onClick={() =>
              exportTableToCSV(
                'attendance'
              )
            }
            className="download-action-btn present-text"
            style={{
              padding: '8px 14px',
              background: '#ecfdf5',
              borderRadius: '8px',
              border:
                '1px solid #a7f3d0',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >

            <FileSpreadsheet
              size={16}
              style={{
                marginRight: '6px'
              }}
            />

            Extract Logs

          </button>

        </div>

        <form
          onSubmit={
            submitAttendance
          }
        >

          <div className="form-row">

            <div className="form-group">

              <label>
                Course Module
              </label>

              <select
                value={
                  selectedSubject
                }
                onChange={(e) =>
                  setSelectedSubject(
                    e.target.value
                  )
                }
              >

                {dbData.subjects.map(
                  (subject) => (

                    <option
                      key={subject}
                      value={subject}
                    >
                      {subject}
                    </option>

                  )
                )}

              </select>

            </div>

            <div className="form-group">

              <label>
                Run Date
              </label>

              <input
                type="date"
                value={
                  attendanceDate
                }
                onChange={(e) =>
                  setAttendanceDate(
                    e.target.value
                  )
                }
                required
              />

            </div>

          </div>

          <table
            className="erp-table"
            style={{
              marginTop: '20px'
            }}
          >

            <thead>

              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status Flag</th>
              </tr>

            </thead>

            <tbody>

              {dbData.studentRecords.map(
                (student) => (

                  <tr
                    key={student.id}
                  >

                    <td>
                      <code>
                        {student.id}
                      </code>
                    </td>

                    <td>
                      {student.name}
                    </td>

                    <td>

                      <div className="radio-group">

                        <label className="radio-label present-text">

                          <input
                            type="radio"
                            name={`att-${student.id}`}
                            checked={
                              attendanceRoll[
                                student.id
                              ] ===
                              'Present'
                            }
                            onChange={() =>
                              setAttendanceRoll(
                                (previous) => ({
                                  ...previous,
                                  [student.id]:
                                    'Present'
                                })
                              )
                            }
                          />

                          Present

                        </label>

                        <label className="radio-label absent-text">

                          <input
                            type="radio"
                            name={`att-${student.id}`}
                            checked={
                              attendanceRoll[
                                student.id
                              ] ===
                              'Absent'
                            }
                            onChange={() =>
                              setAttendanceRoll(
                                (previous) => ({
                                  ...previous,
                                  [student.id]:
                                    'Absent'
                                })
                              )
                            }
                          />

                          Absent

                        </label>

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

          <button
            type="submit"
            className="submit-btn"
            style={{
              marginTop: '20px'
            }}
          >
            Commit Roster Sheet
          </button>

        </form>

      </div>
    );
  }

  // ============================================================
  // LEAVE REQUESTS
  // ============================================================

  if (currentView === 'faculty-leaves') {

    return (
      <div className="panel animate-fade">

        <h3>
          Leave Request Approvals
        </h3>

        <table
          className="erp-table"
          style={{
            marginTop: '16px'
          }}
        >

          <thead>

            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Reason Context</th>
              <th>Duration Sequence</th>
              <th>Current Status</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {dbData.leaveRequests.map(
              (request) => (

                <tr
                  key={request.id}
                >

                  <td>
                    <code>
                      {request.id}
                    </code>
                  </td>

                  <td>
                    <strong>
                      {
                        request.studentName ||
                        request.studentId
                      }
                    </strong>
                  </td>

                  <td>
                    {request.reason}
                  </td>

                  <td>
                    {request.startDate}
                    {' to '}
                    {request.endDate}
                  </td>

                  <td>

                    <span
                      className={`status-pill ${request.status.toLowerCase()}`}
                    >
                      {request.status}
                    </span>

                  </td>

                  <td>

                    {request.status ===
                      'Pending' && (

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px'
                        }}
                      >

                        <button
                          className="download-action-btn present-text"
                          onClick={() =>
                            handleFacultyLeaveAction(
                              request.id,
                              'Approved'
                            )
                          }
                        >

                          <Check
                            size={14}
                          />

                          Accept

                        </button>

                        <button
                          className="download-action-btn absent-text"
                          onClick={() =>
                            handleFacultyLeaveAction(
                              request.id,
                              'Rejected'
                            )
                          }
                        >

                          <X
                            size={14}
                          />

                          Deny

                        </button>

                      </div>

                    )}

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>
    );
  }

  // ============================================================
  // PUBLISH NOTES
  // ============================================================

  if (currentView === 'faculty-notes') {

    return (
      <div className="panel animate-fade">

        <h3>
          Publish Academic Materials
        </h3>

        <form
          onSubmit={
            handleFacultyPostNote
          }
          style={{
            maxWidth: '500px',
            marginTop: '16px'
          }}
        >

          <div className="form-group">

            <label>
              Document Title
            </label>

            <input
              type="text"
              value={noteTitle}
              onChange={(e) =>
                setNoteTitle(
                  e.target.value
                )
              }
              placeholder="Lecture notes reference..."
              required
            />

          </div>

          <div
            className="form-group"
            style={{
              marginTop: '12px'
            }}
          >

            <label>
              Subject Stream
            </label>

            <select
              value={noteSubject}
              onChange={(e) =>
                setNoteSubject(
                  e.target.value
                )
              }
            >

              {dbData.subjects.map(
                (subject) => (

                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>

                )
              )}

            </select>

          </div>

          <div
            className="form-group"
            style={{
              marginTop: '12px'
            }}
          >

            <label>
              Upload File
            </label>

            <input
              type="file"
              onChange={(e) =>
                setSelectedFile(
                  e.target.files
                    ? e.target.files[0]
                    : null
                )
              }
              style={{
                border:
                  '1px dashed #ccc',
                width: '100%',
                padding: '10px'
              }}
            />

          </div>

          <button
            type="submit"
            className="submit-btn"
            style={{
              marginTop: '20px'
            }}
          >
            Publish Document
          </button>

        </form>

      </div>
    );
  }

  return null;
}