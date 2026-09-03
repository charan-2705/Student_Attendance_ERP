import React, { useState } from 'react';
import {
  Check,
  X,
  Camera,
  Upload,
  Loader2,
  Users
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

interface FaceImageResult {
  fileKey: string;
  fileName: string;
  facesDetected: number;
  recognizedStudents: string[];
  detectionTime: number | null;
  serverTime: number | null;
}

export default function FacultyPanel({
  dbData,
  currentView,
  fetchERPData,
  exportTableToCSV
}: Props) {
  // Keep students in roll-number order in both attendance views.
  const orderedStudentRecords = [...dbData.studentRecords].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );

  // NORMAL ATTENDANCE STATES
  const [selectedSubject, setSelectedSubject] =
    useState<string>('Data Science');

  const [attendanceDate, setAttendanceDate] =
    useState<string>(new Date().toISOString().split('T')[0]);

  const [attendanceRoll, setAttendanceRoll] =
    useState<Record<string, 'Present' | 'Absent'>>({});

  // FACE ATTENDANCE STATES
  const [faceAttendanceFiles, setFaceAttendanceFiles] =
    useState<File[]>([]);

  const [faceImagePreviews, setFaceImagePreviews] =
    useState<Array<{ file: File; url: string }>>([]);

  const [isFaceProcessing, setIsFaceProcessing] =
    useState(false);

  const [faceAttendanceResult, setFaceAttendanceResult] =
    useState<string[]>([]);

  const [faceImageResults, setFaceImageResults] =
    useState<FaceImageResult[]>([]);

  const [faceAttendanceMarked, setFaceAttendanceMarked] =
    useState(false);

  const [faceElapsedTime, setFaceElapsedTime] =
    useState(0);

  const [processedImageCount, setProcessedImageCount] =
    useState(0);

  const [faceAttendanceMessage, setFaceAttendanceMessage] =
    useState('');

  const [rollSearch, setRollSearch] = useState('');

  React.useEffect(() => {
    return () => {
      faceImagePreviews.forEach((preview) =>
        URL.revokeObjectURL(preview.url)
      );
    };
  }, [faceImagePreviews]);

  // NOTES STATES
  const [noteTitle, setNoteTitle] = useState('');

  const [noteSubject, setNoteSubject] =
    useState('Data Science');

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  // INITIALIZE NORMAL ATTENDANCE
  React.useEffect(() => {
    const initialRoll: Record<string, 'Present' | 'Absent'> = {};

    dbData.studentRecords.forEach((student) => {
      initialRoll[student.id] = 'Present';
    });

    setAttendanceRoll((previous) =>
      Object.keys(previous).length === 0
        ? initialRoll
        : previous
    );
  }, [dbData.studentRecords]);

  // NORMAL MANUAL ATTENDANCE
  const submitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('erp_session_token');

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

      alert('Roster logs securely committed.');
      fetchERPData();
    } catch (error: any) {
      console.error(error);
      alert(`Failed to submit attendance: ${error.message}`);
    }
  };

  // FACE ATTENDANCE
  const resetFaceResults = () => {
    setFaceAttendanceResult([]);
    setFaceImageResults([]);
    setFaceAttendanceMarked(false);
    setFaceElapsedTime(0);
    setProcessedImageCount(0);
    setFaceAttendanceMessage('');
  };

  const handleFaceFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const incoming = Array.from(fileList).filter((file) =>
      file.type.startsWith('image/')
    );

    if (incoming.length === 0) {
      alert('Please select image files only.');
      return;
    }

    setFaceAttendanceFiles((previous) => {
      const existingKeys = new Set(
        previous.map(
          (file) =>
            `${file.name}|${file.size}|${file.lastModified}`
        )
      );

      const uniqueIncoming: File[] = [];

      incoming.forEach((file) => {
        const key =
          `${file.name}|${file.size}|${file.lastModified}`;

        if (existingKeys.has(key)) return;

        existingKeys.add(key);
        uniqueIncoming.push(file);
      });

      if (uniqueIncoming.length === 0) {
        return previous;
      }

      setFaceImagePreviews((previousPreviews) => {
        const previewKeys = new Set(
          previousPreviews.map(
            (preview) =>
              `${preview.file.name}|${preview.file.size}|${preview.file.lastModified}`
          )
        );

        const newPreviews = uniqueIncoming
          .filter((file) => {
            const key =
              `${file.name}|${file.size}|${file.lastModified}`;

            if (previewKeys.has(key)) return false;

            previewKeys.add(key);
            return true;
          })
          .map((file) => ({
            file,
            url: URL.createObjectURL(file)
          }));

        return [...previousPreviews, ...newPreviews];
      });

      resetFaceResults();

      return [...previous, ...uniqueIncoming];
    });
  };

  const removeFaceFile = (index: number) => {
    setFaceImagePreviews((previous) => {
      const removed = previous[index];

      if (removed) {
        URL.revokeObjectURL(removed.url);
      }

      return previous.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });

    setFaceAttendanceFiles((previous) =>
      previous.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );

    resetFaceResults();
  };

  const clearFaceFiles = () => {
    faceImagePreviews.forEach((preview) =>
      URL.revokeObjectURL(preview.url)
    );

    setFaceImagePreviews([]);
    setFaceAttendanceFiles([]);

    resetFaceResults();
  };

  const processFaceAttendance = async () => {
    if (faceAttendanceFiles.length === 0) {
      alert(
        'Please select one or more classroom images first.'
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
    setFaceImageResults([]);
    setFaceAttendanceMarked(false);
    setFaceElapsedTime(0);
    setProcessedImageCount(0);

    const timerStart = performance.now();

    const timer = window.setInterval(() => {
      setFaceElapsedTime(
        (performance.now() - timerStart) / 1000
      );
    }, 100);

    try {
      const recognizedSet = new Set<string>();

      let totalFacesDetected = 0;
      let totalDetectionTime = 0;
      let totalServerTime = 0;

      const imageResults: FaceImageResult[] = [];

      for (
        let index = 0;
        index < faceAttendanceFiles.length;
        index += 1
      ) {
        const file = faceAttendanceFiles[index];

        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(
          'http://127.0.0.1:5001/recognize',
          {
            method: 'POST',
            body: formData
          }
        );

        if (!response.ok) {
          throw new Error(
            `Face recognition server returned ${response.status} for ${file.name}`
          );
        }

        const result = await response.json();

        const recognizedStudents: string[] =
          Array.isArray(result.recognized_students)
            ? result.recognized_students
                .map((id: unknown) =>
                  String(id).trim().toUpperCase()
                )
                .filter(Boolean)
            : [];

        recognizedStudents.forEach((id) =>
          recognizedSet.add(id)
        );

        const facesDetected =
          Number(result.faces_detected) || 0;

        const detectionTime =
          Number(
            result.face_detection_time_seconds
          );

        const serverTime =
          Number(
            result.total_processing_time_seconds
          );

        totalFacesDetected += facesDetected;

        if (Number.isFinite(detectionTime)) {
          totalDetectionTime += detectionTime;
        }

        if (Number.isFinite(serverTime)) {
          totalServerTime += serverTime;
        }

        imageResults.push({
          fileKey:
            `${file.name}|${file.size}|${file.lastModified}`,
          fileName: file.name,
          facesDetected,
          recognizedStudents,
          detectionTime:
            Number.isFinite(detectionTime)
              ? detectionTime
              : null,
          serverTime:
            Number.isFinite(serverTime)
              ? serverTime
              : null
        });

        setProcessedImageCount(index + 1);

        setFaceImageResults([...imageResults]);

        setFaceAttendanceResult(
          Array.from(recognizedSet)
        );
      }

      const recognizedStudents =
        Array.from(recognizedSet);

      const elapsed =
        (performance.now() - timerStart) / 1000;

      setFaceAttendanceResult(
        recognizedStudents
      );

      setFaceImageResults(imageResults);

      setFaceElapsedTime(elapsed);

      setProcessedImageCount(
        faceAttendanceFiles.length
      );

      setFaceAttendanceMarked(false);

      if (recognizedStudents.length === 0) {
        setFaceAttendanceMessage(
          'No registered students were recognized.'
        );
      } else {
        setFaceAttendanceMessage(
          `${recognizedStudents.length} unique student(s) recognized across ${faceAttendanceFiles.length} image(s). Duplicate recognitions have been removed.`
        );
      }

      console.log(
        'Face recognition batch result:',
        {
          recognizedStudents,
          totalFacesDetected,
          totalDetectionTime,
          totalServerTime,
          frontendElapsedTime: elapsed,
          imageResults
        }
      );
    } catch (error: any) {
      console.error(
        'Face attendance error:',
        error
      );

      setFaceAttendanceMessage(
        `Face recognition failed: ${
          error?.message || 'Unknown error'
        }`
      );

      alert(
        `Face recognition failed.\n\n${
          error?.message || 'Unknown error'
        }\n\nMake sure the Python server is running on port 5001.`
      );
    } finally {
      window.clearInterval(timer);

      setFaceElapsedTime(
        (performance.now() - timerStart) / 1000
      );

      setIsFaceProcessing(false);
    }
  };

  const markRecognizedFaceAttendance = () => {
    if (faceAttendanceResult.length === 0) {
      alert(
        'No recognized students found. Process the classroom images first.'
      );
      return;
    }

    const recognizedLookup = new Set(
      faceAttendanceResult.map((id) =>
        String(id).trim().toUpperCase()
      )
    );

    const nextAttendance: Record<
      string,
      'Present' | 'Absent'
    > = {};

    orderedStudentRecords.forEach((student) => {
      const studentId =
        String(student.id).trim().toUpperCase();

      nextAttendance[student.id] =
        recognizedLookup.has(studentId)
          ? 'Present'
          : 'Absent';
    });

    setAttendanceRoll(nextAttendance);

    setFaceAttendanceMarked(true);

    setFaceAttendanceMessage(
      `Attendance marked for ${faceAttendanceResult.length} unique recognized student(s).`
    );
  };

  const commitFaceAttendance = async () => {
    if (!faceAttendanceMarked) {
      alert(
        'Click Mark Attendance first, then save the attendance.'
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

      const presentCount =
        Object.values(attendanceRoll).filter(
          (status) => status === 'Present'
        ).length;

      const absentCount =
        Object.values(attendanceRoll).filter(
          (status) => status === 'Absent'
        ).length;

      alert(
        `Face attendance committed successfully.\n\nPresent: ${presentCount}\nAbsent: ${absentCount}\nImages processed: ${processedImageCount}`
      );

      fetchERPData();
    } catch (error: any) {
      console.error(error);

      alert(
        `Failed to commit attendance: ${error.message}`
      );
    }
  };

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

  const handleFacultyPostNote = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const token =
      localStorage.getItem('erp_session_token');

    const formData = new FormData();

    formData.append('title', noteTitle);
    formData.append('subject', noteSubject);

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
        `Failed to publish document: ${error.message}`
      );
    }
  };

  if (currentView === 'faculty-face-attendance') {
    const presentCount =
      orderedStudentRecords.filter(
        (student) =>
          attendanceRoll[student.id] === 'Present'
      ).length;

    const absentCount =
      orderedStudentRecords.length - presentCount;

    const hasProcessedResults =
      processedImageCount > 0;

    const uniqueRecognizedCount =
      faceAttendanceResult.length;

    return (
      <div
        className="panel animate-fade"
        style={{
          padding: '22px',
          background: '#ffffff'
        }}
      >
        <div
          style={{
            border: '1px solid #e8eef7',
            borderRadius: '14px',
            padding: '20px',
            boxShadow:
              '0 8px 28px rgba(15, 23, 42, 0.06)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: '#eef5ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1769ff'
                }}
              >
                <Camera size={30} />
              </div>

              <div>
                <h2
                  style={{
                    margin: 0,
                    color: '#101a3d',
                    fontSize: '25px',
                    lineHeight: 1.2
                  }}
                >
                  Automatic Attendance Preview
                </h2>

                <p
                  style={{
                    margin: '7px 0 0',
                    color: '#7183a7',
                    fontSize: '16px'
                  }}
                >
                  Upload one or more classroom photos.
                  Attendance will be combined from all
                  uploaded images.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={clearFaceFiles}
                disabled={
                  isFaceProcessing ||
                  faceAttendanceFiles.length === 0
                }
                style={{
                  minHeight: '44px',
                  padding: '0 18px',
                  borderRadius: '9px',
                  border: '1px solid #dce5f0',
                  background: '#ffffff',
                  color: '#17213f',
                  fontWeight: 700,
                  cursor: isFaceProcessing
                    ? 'not-allowed'
                    : 'pointer'
                }}
              >
                Clear All
              </button>

              <label
                style={{
                  minHeight: '44px',
                  padding: '0 19px',
                  borderRadius: '9px',
                  background: '#07995f',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isFaceProcessing
                    ? 'not-allowed'
                    : 'pointer'
                }}
              >
                <Upload size={18} />
                Upload More Photos

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isFaceProcessing}
                  onChange={(e) => {
                    handleFaceFiles(
                      e.target.files
                    );

                    e.currentTarget.value = '';
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            {faceImagePreviews.map(
              (preview, index) => {
                const fileKey =
                  `${preview.file.name}|${preview.file.size}|${preview.file.lastModified}`;

                const imageResult =
                  faceImageResults.find(
                    (item) =>
                      item.fileKey === fileKey
                  );

                return (
                  <div
                    key={fileKey}
                    style={{
                      minHeight: '78px',
                      border:
                        '1px solid #dfe7f2',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <img
                      src={preview.url}
                      alt={preview.file.name}
                      style={{
                        width: '96px',
                        height: '62px',
                        objectFit: 'cover',
                        borderRadius: '7px',
                        flexShrink: 0
                      }}
                    />

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      <div
                        style={{
                          color: '#152044',
                          fontWeight: 800,
                          fontSize: '14px',
                          overflow: 'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {preview.file.name}
                      </div>

                      <div
                        style={{
                          color: imageResult
                            ? '#07995f'
                            : '#7183a7',
                          fontSize: '13px',
                          marginTop: '8px',
                          fontWeight: 700
                        }}
                      >
                        {imageResult
                          ? `${imageResult.recognizedStudents.length} recognized • ${imageResult.facesDetected} faces detected`
                          : 'Ready to process'}
                      </div>

                      {imageResult &&
                        imageResult.serverTime !==
                          null && (
                          <div
                            style={{
                              color:
                                '#7183a7',
                              fontSize: '11px',
                              marginTop: '3px'
                            }}
                          >
                            Server:{' '}
                            {imageResult.serverTime.toFixed(
                              2
                            )}
                            s
                          </div>
                        )}
                    </div>

                    <button
                      type="button"
                      aria-label={`Remove ${preview.file.name}`}
                      onClick={() =>
                        removeFaceFile(index)
                      }
                      disabled={isFaceProcessing}
                      style={{
                        width: '30px',
                        height: '30px',
                        border: 0,
                        borderRadius: '50%',
                        background: '#f0f3f8',
                        color: '#152044',
                        fontSize: '21px',
                        lineHeight: 1,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              }
            )}

            <label
              style={{
                minHeight: '78px',
                border:
                  '1px dashed #7bd9b2',
                borderRadius: '10px',
                background: '#f5fff9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '4px',
                color: '#0a5f3e',
                cursor: isFaceProcessing
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              <Upload size={20} />

              <strong>
                Add More Photos
              </strong>

              <span
                style={{
                  fontSize: '12px',
                  color: '#66877a'
                }}
              >
                Click to select more images
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isFaceProcessing}
                onChange={(e) => {
                  handleFaceFiles(
                    e.target.files
                  );

                  e.currentTarget.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              {!faceAttendanceMarked ? (
                <>
                  <div
                    style={{
                      padding:
                        '11px 18px',
                      borderRadius: '9px',
                      background:
                        '#eef5ff',
                      border:
                        '1px solid #d8e6ff',
                      color: '#1559b7',
                      fontWeight: 800
                    }}
                  >
                    ✓&nbsp;{' '}
                    {uniqueRecognizedCount}{' '}
                    Recognized
                  </div>

                  <div
                    style={{
                      padding:
                        '11px 18px',
                      borderRadius: '9px',
                      background:
                        '#f6f8fb',
                      border:
                        '1px solid #e0e7f0',
                      color: '#17213f',
                      fontWeight: 800
                    }}
                  >
                    Total:{' '}
                    {orderedStudentRecords.length}
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      padding:
                        '11px 18px',
                      borderRadius: '9px',
                      background:
                        '#f0fff7',
                      border:
                        '1px solid #d1f2e0',
                      color: '#08733f',
                      fontWeight: 800
                    }}
                  >
                    ✓&nbsp;{' '}
                    {presentCount}{' '}
                    Present
                  </div>

                  <div
                    style={{
                      padding:
                        '11px 18px',
                      borderRadius: '9px',
                      background:
                        '#fff4f4',
                      border:
                        '1px solid #ffd3d3',
                      color: '#dc1f35',
                      fontWeight: 800
                    }}
                  >
                    ×&nbsp;{' '}
                    {absentCount}{' '}
                    Absent
                  </div>

                  <div
                    style={{
                      padding:
                        '11px 18px',
                      borderRadius: '9px',
                      background:
                        '#f6f8fb',
                      border:
                        '1px solid #e0e7f0',
                      color: '#17213f',
                      fontWeight: 800
                    }}
                  >
                    Total:{' '}
                    {orderedStudentRecords.length}
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                padding:
                  '11px 16px',
                borderRadius: '10px',
                background:
                  '#f6f8fb',
                color: '#17213f',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span
                style={{
                  fontSize: '20px'
                }}
              >
                ◷
              </span>

              <span>
                {isFaceProcessing
                  ? `Processing ${faceAttendanceFiles.length} image(s) • ${faceElapsedTime.toFixed(2)}s`
                  : hasProcessedResults
                    ? `Processed ${processedImageCount} image(s) in ${faceElapsedTime.toFixed(2)}s`
                    : 'Ready to process'}
              </span>
            </div>
          </div>

          {hasProcessedResults && (
            <div
              style={{
                marginBottom: '16px',
                padding:
                  '12px 14px',
                borderRadius: '9px',
                background:
                  '#f8fbff',
                border:
                  '1px solid #e1eaf5',
                color: '#526584',
                fontSize: '13px'
              }}
            >
              <strong
                style={{
                  color: '#17213f'
                }}
              >
                Recognition summary:
              </strong>{' '}
              {uniqueRecognizedCount}{' '}
              unique student(s)
              recognized across{' '}
              {processedImageCount}{' '}
              image(s). Duplicate
              recognitions across
              photos are counted only
              once.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(10, minmax(0, 1fr))',
              gap: '7px'
            }}
          >
            {orderedStudentRecords.map(
              (student) => {
                const isPresent =
                  attendanceRoll[
                    student.id
                  ] === 'Present';

                const showStatusColor =
                  faceAttendanceMarked;

                return (
                  <div
                    key={student.id}
                    style={{
                      minWidth: 0,
                      height: '34px',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      borderRadius: '5px',
                      border:
                        showStatusColor
                          ? isPresent
                            ? '1px solid #a9e9c8'
                            : '1px solid #ffb8bd'
                          : '1px solid #d9e2ee',
                      background:
                        showStatusColor
                          ? isPresent
                            ? '#effcf5'
                            : '#fff2f3'
                          : '#f7f9fc',
                      color:
                        showStatusColor
                          ? isPresent
                            ? '#143f2c'
                            : '#c91f35'
                          : '#42516e',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing:
                        '0.05px',
                      padding:
                        '0 4px',
                      boxSizing:
                        'border-box',
                      whiteSpace:
                        'nowrap'
                    }}
                  >
                    {student.id}
                  </div>
                );
              }
            )}
          </div>

          {faceAttendanceMessage && (
            <div
              style={{
                marginTop: '16px',
                color:
                  faceAttendanceMarked
                    ? '#08733f'
                    : '#526584',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              {faceAttendanceMessage}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'flex-end',
              gap: '10px',
              marginTop: '18px',
              flexWrap: 'wrap'
            }}
          >
            {!hasProcessedResults && (
              <button
                type="button"
                onClick={
                  processFaceAttendance
                }
                disabled={
                  isFaceProcessing ||
                  faceAttendanceFiles.length === 0
                }
                className="submit-btn"
                style={{
                  minWidth: '220px'
                }}
              >
                {isFaceProcessing ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Detecting Faces...{' '}
                    {faceElapsedTime.toFixed(
                      1
                    )}
                    s
                  </>
                ) : (
                  <>
                    <Camera size={17} />
                    Detect Faces
                  </>
                )}
              </button>
            )}

            {hasProcessedResults &&
              !faceAttendanceMarked && (
                <button
                  type="button"
                  onClick={
                    markRecognizedFaceAttendance
                  }
                  disabled={
                    isFaceProcessing
                  }
                  className="submit-btn"
                  style={{
                    minWidth: '220px'
                  }}
                >
                  <Check size={17} />
                  Mark Attendance
                </button>
              )}

            {hasProcessedResults &&
              faceAttendanceMarked && (
                <button
                  type="button"
                  onClick={
                    commitFaceAttendance
                  }
                  className="submit-btn"
                  style={{
                    minWidth: '190px'
                  }}
                >
                  <Check size={16} />
                  Save Attendance
                </button>
              )}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'faculty-mark') {
    const presentCount =
      orderedStudentRecords.filter(
        (student) =>
          attendanceRoll[student.id] ===
          'Present'
      ).length;

    const absentCount =
      orderedStudentRecords.length -
      presentCount;

    const resetRollCall = () => {
      const next: Record<
        string,
        'Present' | 'Absent'
      > = {};

      orderedStudentRecords.forEach(
        (student) => {
          next[student.id] =
            'Present';
        }
      );

      setAttendanceRoll(next);
    };

    const markAll = (
      status: 'Present' | 'Absent'
    ) => {
      const next: Record<
        string,
        'Present' | 'Absent'
      > = {};

      orderedStudentRecords.forEach(
        (student) => {
          next[student.id] =
            status;
        }
      );

      setAttendanceRoll(next);
    };

    return (
      <div
        className="panel animate-fade"
        style={{
          padding: '22px',
          background: '#ffffff'
        }}
      >
        <div
          style={{
            border:
              '1px solid #e8eef7',
            borderRadius: '14px',
            padding: '20px',
            boxShadow:
              '0 8px 28px rgba(15, 23, 42, 0.06)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius:
                    '50%',
                  background:
                    '#eef5ff',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  color:
                    '#1769ff'
                }}
              >
                <Users size={25} />
              </div>

              <div>
                <h2
                  style={{
                    margin: 0,
                    color:
                      '#101a3d',
                    fontSize:
                      '24px'
                  }}
                >
                  Roll Call
                  Attendance
                </h2>

                <p
                  style={{
                    margin:
                      '5px 0 0',
                    color:
                      '#7183a7',
                    fontSize:
                      '15px'
                  }}
                >
                  Click on a
                  roll number
                  to toggle
                  attendance
                  status.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap:
                  'wrap'
              }}
            >
              <button
                type="button"
                onClick={
                  resetRollCall
                }
                style={{
                  minHeight:
                    '42px',
                  padding:
                    '0 15px',
                  border:
                    '1px solid #dce5f0',
                  background:
                    '#fff',
                  borderRadius:
                    '8px',
                  color:
                    '#51617f',
                  fontWeight: 700
                }}
              >
                ↻&nbsp; Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  markAll(
                    'Present'
                  )
                }
                style={{
                  minHeight:
                    '42px',
                  padding:
                    '0 15px',
                  border:
                    '1px solid #dce5f0',
                  background:
                    '#fff',
                  borderRadius:
                    '8px',
                  color:
                    '#0a7546',
                  fontWeight: 700
                }}
              >
                ✓&nbsp; Mark All
                Present
              </button>

              <button
                type="button"
                onClick={() =>
                  markAll(
                    'Absent'
                  )
                }
                style={{
                  minHeight:
                    '42px',
                  padding:
                    '0 15px',
                  border:
                    '1px solid #dce5f0',
                  background:
                    '#fff',
                  borderRadius:
                    '8px',
                  color:
                    '#d51f35',
                  fontWeight: 700
                }}
              >
                ×&nbsp; Mark All
                Absent
              </button>

              <button
                type="submit"
                form="roll-call-form"
                style={{
                  minHeight:
                    '42px',
                  padding:
                    '0 15px',
                  border: 0,
                  background:
                    '#2b82f6',
                  borderRadius:
                    '8px',
                  color:
                    '#fff',
                  fontWeight: 800
                }}
              >
                ▣&nbsp; Save
                Attendance
              </button>
            </div>
          </div>

          <form
            id="roll-call-form"
            onSubmit={
              submitAttendance
            }
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap:
                  'wrap',
                marginBottom:
                  '16px'
              }}
            >
              <div
                className="form-group"
                style={{
                  flex:
                    '1 1 260px'
                }}
              >
                <label>
                  Course Module
                </label>

                <select
                  value={
                    selectedSubject
                  }
                  onChange={(
                    e
                  ) =>
                    setSelectedSubject(
                      e.target
                        .value
                    )
                  }
                >
                  {dbData.subjects.map(
                    (
                      subject
                    ) => (
                      <option
                        key={
                          subject
                        }
                        value={
                          subject
                        }
                      >
                        {
                          subject
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                className="form-group"
                style={{
                  flex:
                    '1 1 220px'
                }}
              >
                <label>
                  Run Date
                </label>

                <input
                  type="date"
                  value={
                    attendanceDate
                  }
                  onChange={(
                    e
                  ) =>
                    setAttendanceDate(
                      e.target
                        .value
                    )
                  }
                  required
                />
              </div>

              <div
                style={{
                  flex:
                    '1 1 260px',
                  display:
                    'flex',
                  alignItems:
                    'flex-end'
                }}
              >
                <div
                  style={{
                    position:
                      'relative',
                    width:
                      '100%'
                  }}
                >
                  <span
                    style={{
                      position:
                        'absolute',
                      left:
                        '14px',
                      top:
                        '12px',
                      color:
                        '#7585a4'
                    }}
                  >
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={
                      rollSearch
                    }
                    onChange={(
                      e
                    ) =>
                      setRollSearch(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="Search roll number..."
                    style={{
                      width:
                        '100%',
                      height:
                        '44px',
                      border:
                        '1px solid #dce5f0',
                      borderRadius:
                        '8px',
                      padding:
                        '0 14px 0 36px',
                      boxSizing:
                        'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'space-between',
                gap: '12px',
                flexWrap:
                  'wrap',
                marginBottom:
                  '14px'
              }}
            >
              <div
                style={{
                  display:
                    'flex',
                  gap: '12px',
                  flexWrap:
                    'wrap'
                }}
              >
                <div
                  style={{
                    padding:
                      '11px 18px',
                    borderRadius:
                      '9px',
                    background:
                      '#f0fff7',
                    border:
                      '1px solid #d1f2e0',
                    color:
                      '#08733f',
                    fontWeight: 800
                  }}
                >
                  ✓&nbsp;{' '}
                  {presentCount}{' '}
                  Present
                </div>

                <div
                  style={{
                    padding:
                      '11px 18px',
                    borderRadius:
                      '9px',
                    background:
                      '#fff4f4',
                    border:
                      '1px solid #ffd3d3',
                    color:
                      '#dc1f35',
                    fontWeight: 800
                  }}
                >
                  ×&nbsp;{' '}
                  {absentCount}{' '}
                  Absent
                </div>

                <div
                  style={{
                    padding:
                      '11px 18px',
                    borderRadius:
                      '9px',
                    background:
                      '#f6f8fb',
                    border:
                      '1px solid #e0e7f0',
                    color:
                      '#17213f',
                    fontWeight: 800
                  }}
                >
                  Total:{' '}
                  {
                    orderedStudentRecords.length
                  }
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(10, minmax(0, 1fr))',
                gap: '7px'
              }}
            >
              {orderedStudentRecords
                .filter(
                  (student) =>
                    String(
                      student.id
                    )
                      .toUpperCase()
                      .includes(
                        rollSearch
                      )
                )
                .map(
                  (student) => {
                    const isPresent =
                      attendanceRoll[
                        student.id
                      ] ===
                      'Present';

                    return (
                      <button
                        key={
                          student.id
                        }
                        type="button"
                        onClick={() =>
                          setAttendanceRoll(
                            (
                              previous
                            ) => ({
                              ...previous,
                              [student.id]:
                                isPresent
                                  ? 'Absent'
                                  : 'Present'
                            })
                          )
                        }
                        aria-label={
                          student.id
                        }
                        aria-pressed={
                          isPresent
                        }
                        style={{
                          minWidth:
                            0,
                          height:
                            '34px',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          borderRadius:
                            '5px',
                          border:
                            isPresent
                              ? '1px solid #a9e9c8'
                              : '1px solid #ffb8bd',
                          background:
                            isPresent
                              ? '#effcf5'
                              : '#fff2f3',
                          color:
                            isPresent
                              ? '#143f2c'
                              : '#c91f35',
                          fontSize:
                            '12px',
                          fontWeight:
                            800,
                          padding:
                            '0 4px',
                          cursor:
                            'pointer',
                          whiteSpace:
                            'nowrap',
                          boxSizing:
                            'border-box'
                        }}
                      >
                        {
                          student.id
                        }
                      </button>
                    );
                  }
                )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'faculty-leaves') {
    return (
      <div className="panel animate-fade">
        <h3>
          Leave Request
          Approvals
        </h3>

        <table
          className="erp-table"
          style={{
            marginTop:
              '16px'
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>
                Student Name
              </th>
              <th>
                Reason Context
              </th>
              <th>
                Duration Sequence
              </th>
              <th>
                Current Status
              </th>
              <th>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {dbData.leaveRequests.map(
              (request) => (
                <tr
                  key={
                    request.id
                  }
                >
                  <td>
                    <code>
                      {
                        request.id
                      }
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
                    {
                      request.reason
                    }
                  </td>

                  <td>
                    {
                      request.startDate
                    }
                    {' to '}
                    {
                      request.endDate
                    }
                  </td>

                  <td>
                    <span
                      className={`status-pill ${request.status.toLowerCase()}`}
                    >
                      {
                        request.status
                      }
                    </span>
                  </td>

                  <td>
                    {request.status ===
                      'Pending' && (
                      <div
                        style={{
                          display:
                            'flex',
                          gap:
                            '8px'
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

  if (currentView === 'faculty-notes') {
    return (
      <div className="panel animate-fade">
        <h3>
          Publish Academic
          Materials
        </h3>

        <form
          onSubmit={
            handleFacultyPostNote
          }
          style={{
            maxWidth:
              '500px',
            marginTop:
              '16px'
          }}
        >
          <div className="form-group">
            <label>
              Document Title
            </label>

            <input
              type="text"
              value={
                noteTitle
              }
              onChange={(
                e
              ) =>
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
              marginTop:
                '12px'
            }}
          >
            <label>
              Subject Stream
            </label>

            <select
              value={
                noteSubject
              }
              onChange={(
                e
              ) =>
                setNoteSubject(
                  e.target.value
                )
              }
            >
              {dbData.subjects.map(
                (
                  subject
                ) => (
                  <option
                    key={
                      subject
                    }
                    value={
                      subject
                    }
                  >
                    {
                      subject
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div
            className="form-group"
            style={{
              marginTop:
                '12px'
            }}
          >
            <label>
              Upload File
            </label>

            <input
              type="file"
              onChange={(
                e
              ) =>
                setSelectedFile(
                  e.target.files
                    ? e.target
                        .files[0]
                    : null
                )
              }
              style={{
                border:
                  '1px dashed #ccc',
                width:
                  '100%',
                padding:
                  '10px'
              }}
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            style={{
              marginTop:
                '20px'
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