import React, { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface AcademicNote {
  id: number;
  subject: string;
  title: string;
  date: string;
  size: string;
  filePath?: string;
}

interface LeaveRequest {
  id: string;
  studentId: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface AttendanceHistoryItem {
  studentId: string;
  subject: string;
  date: string;
  status: 'Present' | 'Absent';
}

interface ERPDashboardData {
  subjects: string[];
  sharedNotes: AcademicNote[];
  leaveRequests: LeaveRequest[];
  attendanceLogs?: AttendanceHistoryItem[];
}

interface AIPredictionResult {
  currentRate: string;
  predictedRate: string;
  modelInsights: string;
}

interface StudentPanelProps {
  dbData: ERPDashboardData;
  currentView: string;
  session: any;
  fetchERPData: () => void;
}

export default function StudentPanel({
  dbData,
  currentView,
  session,
  fetchERPData
}: StudentPanelProps) {

  // =========================================================
  // STATES
  // =========================================================

  const [simulatedAbsences, setSimulatedAbsences] =
    useState('0');

  const [aiReport, setAiReport] =
    useState<AIPredictionResult | null>(null);

  const [leaveReason, setLeaveReason] =
    useState('');

  const [leaveStart, setLeaveStart] =
    useState('');

  const [leaveEnd, setLeaveEnd] =
    useState('');

  // =========================================================
  // AI ATTENDANCE FORECAST
  // =========================================================

  const runAIEngineForecast = () => {

    const token =
      localStorage.getItem('erp_session_token');

    fetch(
      'http://localhost:5000/api/ai/predict-attendance',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: session?.studentId,
          additionalProjectedAbsences:
            simulatedAbsences
        })
      }
    )
      .then(res => res.json())
      .then((data: AIPredictionResult) => {
        setAiReport(data);
      })
      .catch(err => {
        console.error(
          'AI attendance forecast error:',
          err
        );
      });
  };

  useEffect(() => {

    if (
      currentView ===
      'student-ai-insights'
    ) {
      runAIEngineForecast();
    }

  }, [currentView]);

  // =========================================================
  // LEAVE SUBMISSION
  // =========================================================

  const handleLeaveSubmit = (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    const token =
      localStorage.getItem(
        'erp_session_token'
      );

    fetch(
      'http://localhost:5000/api/student/apply-leave',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: session?.studentId,
          reason: leaveReason,
          startDate: leaveStart,
          endDate: leaveEnd
        })
      }
    )
      .then(res => res.json())
      .then(() => {

        alert(
          'Leave exception filed.'
        );

        setLeaveReason('');
        setLeaveStart('');
        setLeaveEnd('');

        fetchERPData();
      })
      .catch(err => {
        console.error(
          'Leave submission error:',
          err
        );
      });
  };

  // =========================================================
  // CURRENT STUDENT ATTENDANCE LOGS
  // =========================================================

  const studentAttendanceLogs =
    useMemo(() => {

      if (
        !dbData.attendanceLogs ||
        !session?.studentId
      ) {
        return [];
      }

      const currentStudentId =
        String(session.studentId)
          .trim()
          .toLowerCase();

      return dbData.attendanceLogs.filter(
        log =>
          String(
            log.studentId || ''
          )
            .trim()
            .toLowerCase() ===
          currentStudentId
      );

    }, [
      dbData.attendanceLogs,
      session?.studentId
    ]);

  // =========================================================
  // OVERALL ATTENDANCE CALCULATION
  // =========================================================

  const overallAttendance =
    useMemo(() => {

      if (
        studentAttendanceLogs.length === 0
      ) {
        return 0;
      }

      const presentCount =
        studentAttendanceLogs.filter(
          log =>
            log.status === 'Present'
        ).length;

      return Math.round(
        (
          presentCount /
          studentAttendanceLogs.length
        ) * 100
      );

    }, [studentAttendanceLogs]);

  // =========================================================
  // SUBJECT-WISE ATTENDANCE GRAPH DATA
  // =========================================================

  const subjectAttendanceData =
    useMemo(() => {

      const subjectMap: Record<
        string,
        {
          total: number;
          present: number;
        }
      > = {};

      studentAttendanceLogs.forEach(
        log => {

          const subject =
            String(
              log.subject || 'Unknown'
            ).trim();

          if (!subjectMap[subject]) {
            subjectMap[subject] = {
              total: 0,
              present: 0
            };
          }

          subjectMap[subject].total += 1;

          if (
            log.status === 'Present'
          ) {
            subjectMap[subject].present += 1;
          }

        }
      );

      return Object.entries(
        subjectMap
      )
        .map(
          ([subject, values]) => ({
            subject,
            percentage:
              values.total === 0
                ? 0
                : Math.round(
                    (
                      values.present /
                      values.total
                    ) * 100
                  ),
            present: values.present,
            absent:
              values.total -
              values.present,
            total: values.total
          })
        )
        .sort(
          (a, b) =>
            b.percentage -
            a.percentage
        );

    }, [studentAttendanceLogs]);

  // =========================================================
  // DATE-WISE ATTENDANCE LEDGER
  // =========================================================

  const dateWiseAttendance =
    useMemo(() => {

      const grouped:
        Record<
          string,
          AttendanceHistoryItem[]
        > = {};

      studentAttendanceLogs.forEach(
        log => {

          const date =
            String(
              log.date || ''
            ).trim();

          if (!grouped[date]) {
            grouped[date] = [];
          }

          grouped[date].push(log);

        }
      );

      return Object.entries(
        grouped
      )
        .sort(
          ([dateA], [dateB]) =>
            new Date(dateB).getTime() -
            new Date(dateA).getTime()
        )
        .map(
          ([date, records]) => ({
            date,
            records: records.sort(
              (a, b) =>
                a.subject.localeCompare(
                  b.subject
                )
            )
          })
        );

    }, [studentAttendanceLogs]);

  // =========================================================
  // DATE FORMATTER
  // =========================================================

  const formatAttendanceDate = (
    dateString: string
  ) => {

    if (!dateString) {
      return 'Unknown Date';
    }

    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateString;
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  // =========================================================
  // PRESENT / ABSENT TOTALS
  // =========================================================

  const totalPresent =
    studentAttendanceLogs.filter(
      log =>
        log.status === 'Present'
    ).length;

  const totalAbsent =
    studentAttendanceLogs.filter(
      log =>
        log.status === 'Absent'
    ).length;

  const totalConducted =
    studentAttendanceLogs.length;

  // =========================================================
  // AI INSIGHTS PAGE
  // =========================================================

  if (
    currentView ===
    'student-ai-insights'
  ) {

    const rate =
      aiReport
        ? parseInt(
            aiReport.predictedRate
          ) || 0
        : 0;

    const isSafe =
      rate >= 75;

    let recoveryMessage =
      'You are currently trending below the required 75% baseline.';

    if (
      studentAttendanceLogs.length > 0
    ) {

      const actualTotal =
        studentAttendanceLogs.length;

      const actualAttended =
        studentAttendanceLogs.filter(
          log =>
            log.status === 'Present'
        ).length;

      const projectionAbsences =
        parseInt(
          simulatedAbsences
        ) || 0;

      const simulatedTotalConducted =
        actualTotal +
        projectionAbsences;

      if (
        !isSafe &&
        simulatedTotalConducted > 0
      ) {

        const classesNeeded =
          Math.ceil(
            (
              0.75 *
              simulatedTotalConducted -
              actualAttended
            ) / 0.25
          );

        recoveryMessage =
          `You need to attend ${Math.max(
            1,
            classesNeeded
          )} more consecutive classes to reach the mandatory 75% threshold.`;
      }
    }

    return (
      <div className="panel animate-fade">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div
          style={{
            marginBottom: '24px'
          }}
        >

          <h2
            style={{
              margin: 0,
              fontSize: '24px'
            }}
          >
            Attendance Overview
          </h2>

          <p
            style={{
              color: '#6b7280',
              marginTop: '6px'
            }}
          >
            Monitor your overall attendance,
            subject-wise performance and
            projected attendance.
          </p>

        </div>

        {/* =====================================================
            SUMMARY CARDS
        ====================================================== */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }}
        >

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '18px'
            }}
          >

            <div
              style={{
                fontSize: '13px',
                color: '#6b7280'
              }}
            >
              Overall Attendance
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                marginTop: '6px',
                color:
                  overallAttendance >= 75
                    ? '#16a34a'
                    : '#dc2626'
              }}
            >
              {overallAttendance}%
            </div>

          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '18px'
            }}
          >

            <div
              style={{
                fontSize: '13px',
                color: '#6b7280'
              }}
            >
              Classes Conducted
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                marginTop: '6px'
              }}
            >
              {totalConducted}
            </div>

          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '18px'
            }}
          >

            <div
              style={{
                fontSize: '13px',
                color: '#6b7280'
              }}
            >
              Present
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                marginTop: '6px',
                color: '#16a34a'
              }}
            >
              {totalPresent}
            </div>

          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '18px'
            }}
          >

            <div
              style={{
                fontSize: '13px',
                color: '#6b7280'
              }}
            >
              Absent
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                marginTop: '6px',
                color: '#dc2626'
              }}
            >
              {totalAbsent}
            </div>

          </div>

        </div>

        {/* =====================================================
            MAIN ATTENDANCE SECTION
        ====================================================== */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 2fr',
            gap: '24px',
            alignItems: 'start'
          }}
        >

          {/* ===================================================
              OVERALL ATTENDANCE
          ==================================================== */}

          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              border:
                '1px solid #f3e8ff',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >

            <h3
              style={{
                margin:
                  '0 0 14px 0'
              }}
            >
              Attendance Percentage
            </h3>

            <div
              style={{
                width: '100%',
                height: 240,
                position: 'relative'
              }}
            >

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="92%"
                  barSize={16}
                  startAngle={90}
                  endAngle={-270}
                  data={[
                    {
                      name: 'Background',
                      value: 100,
                      fill: '#f3e8ff'
                    },
                    {
                      name: 'Attendance',
                      value:
                        overallAttendance,
                      fill:
                        overallAttendance >=
                        75
                          ? '#16a34a'
                          : '#dc2626'
                    }
                  ]}
                >

                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                  />

                </RadialBarChart>

              </ResponsiveContainer>

              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform:
                    'translate(-50%, -50%)',
                  textAlign: 'center'
                }}
              >

                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: '700',
                    color:
                      overallAttendance >=
                      75
                        ? '#16a34a'
                        : '#dc2626'
                  }}
                >
                  {overallAttendance}%
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  Overall
                </div>

              </div>

            </div>

            {/* 75% STATUS */}

            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                background:
                  overallAttendance >=
                  75
                    ? '#dcfce7'
                    : '#fee2e2',
                color:
                  overallAttendance >=
                  75
                    ? '#15803d'
                    : '#991b1b',
                fontWeight: '600'
              }}
            >

              {overallAttendance >=
              75
                ? '✅ Attendance is above the 75% requirement'
                : '⚠️ Attendance is below the 75% requirement'}

            </div>

          </div>

          {/* ===================================================
              SUBJECT-WISE GRAPH
          ==================================================== */}

          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              border:
                '1px solid #e5e7eb'
            }}
          >

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}
            >

              <div>

                <h3
                  style={{
                    margin: 0
                  }}
                >
                  Subject-wise Attendance
                </h3>

                <p
                  style={{
                    margin:
                      '5px 0 0',
                    color: '#6b7280',
                    fontSize: '13px'
                  }}
                >
                  Attendance percentage for
                  each subject
                </p>

              </div>

              <span
                style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}
              >
                Target: 75%
              </span>

            </div>

            {subjectAttendanceData.length >
            0 ? (

              <div
                style={{
                  width: '100%',
                  height: Math.max(
                    260,
                    subjectAttendanceData.length *
                      65
                  )
                }}
              >

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      subjectAttendanceData
                    }
                    layout="vertical"
                    margin={{
                      top: 10,
                      right: 30,
                      left: 20,
                      bottom: 10
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={value =>
                        `${value}%`
                      }
                    />

                    <YAxis
                      dataKey="subject"
                      type="category"
                      width={120}
                      tick={{
                        fontSize: 12
                      }}
                    />

                    <Tooltip
                      formatter={(
                        value: any
                      ) => [
                        `${value}%`,
                        'Attendance'
                      ]}
                      labelFormatter={label =>
                        String(label)
                      }
                    />

                    <Legend />

                    <Bar
                      dataKey="percentage"
                      name="Attendance"
                      fill="#7c3aed"
                      radius={[
                        0,
                        6,
                        6,
                        0
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            ) : (

              <div
                style={{
                  height: '260px',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  color: '#9ca3af',
                  fontSize: '14px'
                }}
              >
                No attendance data available
                for subject analysis.
              </div>

            )}

            {/* SUBJECT DETAIL TABLE */}

            {subjectAttendanceData.length >
              0 && (

              <div
                style={{
                  marginTop: '18px',
                  borderTop:
                    '1px solid #e5e7eb',
                  paddingTop: '15px'
                }}
              >

                <h4>
                  Subject Breakdown
                </h4>

                <table
                  className="erp-table"
                  style={{
                    marginTop: '10px'
                  }}
                >

                  <thead>

                    <tr>
                      <th>
                        Subject
                      </th>

                      <th>
                        Present
                      </th>

                      <th>
                        Absent
                      </th>

                      <th>
                        Percentage
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {subjectAttendanceData.map(
                      item => (

                        <tr
                          key={
                            item.subject
                          }
                        >

                          <td>
                            <strong>
                              {
                                item.subject
                              }
                            </strong>
                          </td>

                          <td>
                            {item.present}
                          </td>

                          <td>
                            {item.absent}
                          </td>

                          <td>

                            <span
                              style={{
                                fontWeight:
                                  '700',
                                color:
                                  item.percentage >=
                                  75
                                    ? '#16a34a'
                                    : '#dc2626'
                              }}
                            >
                              {
                                item.percentage
                              }%
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>

        {/* =====================================================
            AI PREDICTION SECTION
        ====================================================== */}

        <div
          style={{
            marginTop: '24px'
          }}
        >

          <div
            style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              border:
                '1px solid #e5e7eb'
            }}
          >

            <h3>
              Attendance Prediction
            </h3>

            <p
              style={{
                color: '#6b7280',
                fontSize: '13px'
              }}
            >
              Simulate additional absences
              and see how your attendance
              could change.
            </p>

            <div
              style={{
                maxWidth: '500px',
                marginTop: '16px'
              }}
            >

              <div className="form-group">

                <label>
                  Simulate Additional Absences
                </label>

                <input
                  type="number"
                  min="0"
                  max="30"
                  value={
                    simulatedAbsences
                  }
                  onChange={e =>
                    setSimulatedAbsences(
                      e.target.value
                    )
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border:
                      '1px solid #d1d5db',
                    marginTop: '6px'
                  }}
                />

              </div>

              <button
                onClick={
                  runAIEngineForecast
                }
                className="submit-btn"
                style={{
                  marginTop: '16px',
                  width: '100%'
                }}
              >
                Run Calibration Analysis
              </button>

            </div>

            {aiReport && (

              <div
                style={{
                  marginTop: '20px',
                  padding: '16px',
                  borderRadius: '8px',
                  background:
                    isSafe
                      ? '#f0fdf4'
                      : '#fef2f2',
                  border:
                    isSafe
                      ? '1px solid #bbf7d0'
                      : '1px solid #fecaca'
                }}
              >

                <div
                  style={{
                    fontSize: '13px',
                    color: '#6b7280'
                  }}
                >
                  Predicted Attendance
                </div>

                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    marginTop: '5px',
                    color:
                      isSafe
                        ? '#15803d'
                        : '#b91c1c'
                  }}
                >
                  {aiReport.predictedRate}%
                </div>

                <p
                  style={{
                    margin:
                      '8px 0 0',
                    fontSize: '13px'
                  }}
                >
                  {isSafe
                    ? '✅ Your projected attendance remains above the required threshold.'
                    : recoveryMessage}
                </p>

              </div>

            )}

          </div>

        </div>

      </div>
    );
  }

  // =========================================================
  // DATE-WISE ATTENDANCE LEDGER
  // =========================================================

  if (
    currentView ===
    'student-logs'
  ) {

    return (
      <div className="panel animate-fade">

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}
        >

          <div>

            <h3
              style={{
                margin: 0
              }}
            >
              Attendance Ledger
            </h3>

            <p
              style={{
                color: '#6b7280',
                fontSize: '13px',
                marginTop: '5px'
              }}
            >
              Your attendance records
              grouped by date.
            </p>

          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px'
            }}
          >

            <span
              className="status-pill approved"
            >
              Present: {totalPresent}
            </span>

            <span
              className="status-pill rejected"
            >
              Absent: {totalAbsent}
            </span>

          </div>

        </div>

        {dateWiseAttendance.length ===
        0 ? (

          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#9ca3af',
              border:
                '1px dashed #d1d5db',
              borderRadius: '10px'
            }}
          >
            No attendance records
            available.
          </div>

        ) : (

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >

            {dateWiseAttendance.map(
              day => (

                <div
                  key={day.date}
                  style={{
                    border:
                      '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background:
                      '#ffffff'
                  }}
                >

                  {/* DATE HEADER */}

                  <div
                    style={{
                      padding:
                        '14px 18px',
                      background:
                        '#f5f3ff',
                      borderBottom:
                        '1px solid #ddd6fe',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center'
                    }}
                  >

                    <div>

                      <div
                        style={{
                          fontWeight:
                            '700',
                          color:
                            '#4c1d95',
                          fontSize:
                            '15px'
                        }}
                      >
                        {formatAttendanceDate(
                          day.date
                        )}
                      </div>

                      <div
                        style={{
                          fontSize:
                            '12px',
                          color:
                            '#6b7280',
                          marginTop:
                            '3px'
                        }}
                      >
                        {
                          day.records
                            .length
                        }{' '}
                        class/session record
                        {day.records.length !==
                        1
                          ? 's'
                          : ''}
                      </div>

                    </div>

                    <span
                      style={{
                        fontSize:
                          '12px',
                        color:
                          '#6b7280'
                      }}
                    >
                      Attendance Date
                    </span>

                  </div>

                  {/* DAY RECORDS */}

                  <table
                    className="erp-table"
                    style={{
                      margin: 0
                    }}
                  >

                    <thead>

                      <tr>
                        <th>
                          Subject
                        </th>

                        <th>
                          Status
                        </th>
                      </tr>

                    </thead>

                    <tbody>

                      {day.records.map(
                        (
                          log,
                          index
                        ) => (

                          <tr
                            key={`${day.date}-${log.subject}-${index}`}
                          >

                            <td>
                              <strong>
                                {
                                  log.subject
                                }
                              </strong>
                            </td>

                            <td>

                              <span
                                className={`status-pill ${
                                  log.status ===
                                  'Present'
                                    ? 'approved'
                                    : 'rejected'
                                }`}
                              >
                                {log.status ===
                                'Present'
                                  ? '✓ Present'
                                  : '✕ Absent'}
                              </span>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )
            )}

          </div>

        )}

      </div>
    );
  }

  // =========================================================
  // LECTURE NOTES
  // =========================================================

  if (
    currentView ===
    'student-notes'
  ) {

    return (
      <div className="panel animate-fade">

        <h3>
          Course Study Material Repository
        </h3>

        <table
          className="erp-table"
          style={{
            marginTop: '16px'
          }}
        >

          <thead>

            <tr>
              <th>Subject</th>
              <th>Document Title</th>
              <th>Published Date</th>
              <th>Size</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {dbData.sharedNotes.map(
              note => (

                <tr
                  key={note.id}
                >

                  <td>

                    <span className="status-pill pending">
                      {note.subject}
                    </span>

                  </td>

                  <td>
                    <strong>
                      {note.title}
                    </strong>
                  </td>

                  <td>
                    {note.date}
                  </td>

                  <td>
                    <code>
                      {note.size}
                    </code>
                  </td>

                  <td>

                    {note.filePath ? (

                      <a
                        href={`http://localhost:5000${note.filePath}`}
                        download
                        className="download-action-btn present-text"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          textDecoration:
                            'none'
                        }}
                      >

                        <Download
                          size={14}
                        />

                        Get Asset

                      </a>

                    ) : (

                      <span
                        style={{
                          color:
                            '#9ca3af'
                        }}
                      >
                        No file linked
                      </span>

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

  // =========================================================
  // LEAVE OPERATIONS
  // =========================================================

  if (
    currentView ===
    'student-leave'
  ) {

    return (
      <div className="panel animate-fade">

        <form
          onSubmit={
            handleLeaveSubmit
          }
          style={{
            maxWidth: '500px'
          }}
        >

          <h3>
            File Institutional Leave Exception
          </h3>

          <div
            className="form-group"
            style={{
              marginTop: '14px'
            }}
          >

            <label>
              Reason Context
            </label>

            <input
              type="text"
              value={leaveReason}
              onChange={e =>
                setLeaveReason(
                  e.target.value
                )
              }
              placeholder="Provide verification basis..."
              required
            />

          </div>

          <div
            className="form-row"
            style={{
              marginTop: '12px'
            }}
          >

            <div className="form-group">

              <label>
                Commence Date
              </label>

              <input
                type="date"
                value={leaveStart}
                onChange={e =>
                  setLeaveStart(
                    e.target.value
                  )
                }
                required
              />

            </div>

            <div className="form-group">

              <label>
                Termination Date
              </label>

              <input
                type="date"
                value={leaveEnd}
                onChange={e =>
                  setLeaveEnd(
                    e.target.value
                  )
                }
                required
              />

            </div>

          </div>

          <button
            type="submit"
            className="submit-btn"
            style={{
              marginTop: '20px'
            }}
          >
            Submit Request Pipeline
          </button>

        </form>

        <table
          className="erp-table"
          style={{
            marginTop: '30px'
          }}
        >

          <thead>

            <tr>
              <th>ID Code</th>
              <th>Reason</th>
              <th>Timeline Span</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            {dbData.leaveRequests
              ?.filter(
                request =>
                  String(
                    request.studentId ||
                      ''
                  )
                    .trim()
                    .toLowerCase() ===
                  String(
                    session?.studentId ||
                      ''
                  )
                    .trim()
                    .toLowerCase()
              )
              .map(request => (

                <tr
                  key={request.id}
                >

                  <td>
                    <code>
                      {request.id}
                    </code>
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

                </tr>

              ))}

          </tbody>

        </table>

      </div>
    );
  }

  return null;
}