import React from 'react';

import AIAttendanceInsights from './AIAttendanceInsights';
import StudentAttendanceLedger from './StudentAttendanceLedger';
import StudentLeave from './StudentLeave';
import StudentNotes from './StudentNotes';

import useStudentAttendance from '../../hooks/useStudentAttendance';
import useAIAttendanceForecast from '../../hooks/useAIAttendanceForecast';

import {
  ERPDashboardData,
  UserSession
} from '../../types';

interface StudentPanelProps {
  dbData: ERPDashboardData;
  currentView: string;
  session: UserSession;
  fetchERPData: () => void;
}

export default function StudentPanel({
  dbData,
  currentView,
  session,
  fetchERPData
}: StudentPanelProps) {
  const {
    simulatedAbsences,
    setSimulatedAbsences,
    aiReport,
    runAIEngineForecast
  } = useAIAttendanceForecast({
    studentId:
      session?.studentId,
    currentView
  });

  const {
    studentAttendanceLogs,
    overallAttendance,
    subjectAttendanceData,
    dateWiseAttendance,
    totalPresent,
    totalAbsent,
    totalConducted,
    formatAttendanceDate
  } = useStudentAttendance({
    attendanceLogs:
      dbData.attendanceLogs,
    studentId:
      session?.studentId
  });

  if (
    currentView ===
    'student-ai-insights'
  ) {
    return (
      <AIAttendanceInsights
        overallAttendance={
          overallAttendance
        }
        totalConducted={
          totalConducted
        }
        totalPresent={
          totalPresent
        }
        totalAbsent={
          totalAbsent
        }
        subjectAttendanceData={
          subjectAttendanceData
        }
        simulatedAbsences={
          simulatedAbsences
        }
        setSimulatedAbsences={
          setSimulatedAbsences
        }
        aiReport={aiReport}
        runAIEngineForecast={
          runAIEngineForecast
        }
        studentAttendanceLogs={
          studentAttendanceLogs
        }
      />
    );
  }

  if (
    currentView ===
    'student-logs'
  ) {
    return (
      <StudentAttendanceLedger
        dateWiseAttendance={
          dateWiseAttendance
        }
        totalPresent={
          totalPresent
        }
        totalAbsent={
          totalAbsent
        }
        formatAttendanceDate={
          formatAttendanceDate
        }
      />
    );
  }

  if (
    currentView ===
    'student-notes'
  ) {
    return (
      <StudentNotes
        sharedNotes={
          dbData.sharedNotes
        }
      />
    );
  }

  if (
    currentView ===
    'student-leave'
  ) {
    return (
      <StudentLeave
        leaveRequests={
          dbData.leaveRequests
        }
        studentId={
          session?.studentId
        }
        fetchERPData={
          fetchERPData
        }
      />
    );
  }

  return null;
}