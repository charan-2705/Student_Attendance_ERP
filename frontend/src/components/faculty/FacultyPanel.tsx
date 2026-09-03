import React, {
  useEffect,
  useState
} from 'react';

import FaceAttendancePanel from './FaceAttendancePanel';
import RollCall from './RollCall';
import LeaveRequests from './LeaveRequests';
import PublishNotes from './PublishNotes';

import {
  ERPDashboardData,
  AttendanceStatus
} from '../../types';

interface Props {
  dbData: ERPDashboardData;
  currentView: string;
  fetchERPData: () => void;
  exportTableToCSV: (
    datasetType:
      | 'students'
      | 'attendance'
      | 'leaves'
  ) => void;
}

export default function FacultyPanel({
  dbData,
  currentView,
  fetchERPData
}: Props) {
  const orderedStudentRecords =
    [...dbData.studentRecords].sort(
      (a, b) =>
        String(a.id).localeCompare(
          String(b.id)
        )
    );

  const [
    selectedSubject,
    setSelectedSubject
  ] = useState<string>(
    'Data Science'
  );

  const [
    attendanceDate,
    setAttendanceDate
  ] = useState<string>(
    new Date()
      .toISOString()
      .split('T')[0]
  );

  const [
    attendanceRoll,
    setAttendanceRoll
  ] = useState<
    Record<string, AttendanceStatus>
  >({});

  useEffect(() => {
    const initialRoll: Record<
      string,
      AttendanceStatus
    > = {};

    dbData.studentRecords.forEach(
      (student) => {
        initialRoll[student.id] =
          'Present';
      }
    );

    setAttendanceRoll(
      (previous) =>
        Object.keys(previous)
          .length === 0
          ? initialRoll
          : previous
    );
  }, [dbData.studentRecords]);

  const submitAttendance =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      const token =
        localStorage.getItem(
          'erp_session_token'
        );

      const formattedRecords =
        Object.keys(
          attendanceRoll
        ).map((id) => ({
          studentId: id,
          status:
            attendanceRoll[id]
        }));

      try {
        const response =
          await fetch(
            'http://localhost:5000/api/attendance/submit',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                subject:
                  selectedSubject,
                date:
                  attendanceDate,
                records:
                  formattedRecords
              })
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Attendance submission failed.'
          );
        }

        alert(
          'Roster logs securely committed.'
        );

        fetchERPData();
      } catch (error) {
        console.error(error);

        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';

        alert(
          `Failed to submit attendance: ${message}`
        );
      }
    };

  if (
    currentView ===
    'faculty-face-attendance'
  ) {
    return (
      <FaceAttendancePanel
        studentRecords={
          dbData.studentRecords
        }
        attendanceRoll={
          attendanceRoll
        }
        setAttendanceRoll={
          setAttendanceRoll
        }
        selectedSubject={
          selectedSubject
        }
        attendanceDate={
          attendanceDate
        }
        fetchERPData={
          fetchERPData
        }
      />
    );
  }

  if (
    currentView ===
    'faculty-mark'
  ) {
    return (
      <RollCall
        subjects={
          dbData.subjects
        }
        orderedStudentRecords={
          orderedStudentRecords
        }
        attendanceRoll={
          attendanceRoll
        }
        setAttendanceRoll={
          setAttendanceRoll
        }
        selectedSubject={
          selectedSubject
        }
        setSelectedSubject={
          setSelectedSubject
        }
        attendanceDate={
          attendanceDate
        }
        setAttendanceDate={
          setAttendanceDate
        }
        submitAttendance={
          submitAttendance
        }
      />
    );
  }

  if (
    currentView ===
    'faculty-leaves'
  ) {
    return (
      <LeaveRequests
        leaveRequests={
          dbData.leaveRequests
        }
        fetchERPData={
          fetchERPData
        }
      />
    );
  }

  if (
    currentView ===
    'faculty-notes'
  ) {
    return (
      <PublishNotes
        subjects={
          dbData.subjects
        }
        fetchERPData={
          fetchERPData
        }
      />
    );
  }

  return null;
}