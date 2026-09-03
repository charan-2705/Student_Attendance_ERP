import React from 'react';

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

import {
  AttendanceHistoryItem,
  SubjectAttendance
} from '../../types';

interface AIPredictionResult {
  currentRate: string;
  predictedRate: string;
  modelInsights: string;
}

interface AIAttendanceInsightsProps {
  overallAttendance: number;
  totalConducted: number;
  totalPresent: number;
  totalAbsent: number;
  subjectAttendanceData: SubjectAttendance[];
  simulatedAbsences: string;
  setSimulatedAbsences: React.Dispatch<
    React.SetStateAction<string>
  >;
  aiReport: AIPredictionResult | null;
  runAIEngineForecast: () => void;
  studentAttendanceLogs: AttendanceHistoryItem[];
}

export default function AIAttendanceInsights({
  overallAttendance,
  totalConducted,
  totalPresent,
  totalAbsent,
  subjectAttendanceData,
  simulatedAbsences,
  setSimulatedAbsences,
  aiReport,
  runAIEngineForecast,
  studentAttendanceLogs
}: AIAttendanceInsightsProps) {
  const rate =
    aiReport
      ? parseInt(aiReport.predictedRate) || 0
      : 0;

  const isSafe = rate >= 75;

  let recoveryMessage =
    'You are currently trending below the required 75% baseline.';

  if (studentAttendanceLogs.length > 0) {
    const actualTotal =
      studentAttendanceLogs.length;

    const actualAttended =
      studentAttendanceLogs.filter(
        log => log.status === 'Present'
      ).length;

    const projectionAbsences =
      parseInt(simulatedAbsences) || 0;

    const simulatedTotalConducted =
      actualTotal + projectionAbsences;

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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 2fr',
          gap: '24px',
          alignItems: 'start'
        }}
      >
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
              margin: '0 0 14px 0'
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
                      overallAttendance >= 75
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
                    overallAttendance >= 75
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

          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center',
              background:
                overallAttendance >= 75
                  ? '#dcfce7'
                  : '#fee2e2',
              color:
                overallAttendance >= 75
                  ? '#15803d'
                  : '#991b1b',
              fontWeight: '600'
            }}
          >
            {overallAttendance >= 75
              ? '✅ Attendance is above the 75% requirement'
              : '⚠️ Attendance is below the 75% requirement'}
          </div>
        </div>

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
                  margin: '5px 0 0',
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

          {subjectAttendanceData.length > 0 ? (
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
                    formatter={value => {
                      let displayValue = 0;

                      if (
                        Array.isArray(value)
                      ) {
                        const firstValue =
                          value[0];

                        if (
                          typeof firstValue ===
                            'number' ||
                          typeof firstValue ===
                            'string'
                        ) {
                          displayValue =
                            Number(
                              firstValue
                            ) || 0;
                        }
                      } else if (
                        typeof value ===
                          'number' ||
                        typeof value ===
                          'string'
                      ) {
                        displayValue =
                          Number(value) || 0;
                      }

                      return [
                        `${displayValue}%`,
                        'Attendance'
                      ];
                    }}
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
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: '14px'
              }}
            >
              No attendance data available
              for subject analysis.
            </div>
          )}

          {subjectAttendanceData.length > 0 && (
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
                            {item.subject}
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
                value={simulatedAbsences}
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
                  margin: '8px 0 0',
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