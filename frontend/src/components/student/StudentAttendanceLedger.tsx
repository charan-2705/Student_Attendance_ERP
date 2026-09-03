import React from 'react';

import {
  DateWiseAttendance
} from '../../types';

interface StudentAttendanceLedgerProps {
  dateWiseAttendance: DateWiseAttendance[];
  totalPresent: number;
  totalAbsent: number;
  formatAttendanceDate: (dateString: string) => string;
}

export default function StudentAttendanceLedger({
  dateWiseAttendance,
  totalPresent,
  totalAbsent,
  formatAttendanceDate
}: StudentAttendanceLedgerProps) {
  return (
    <div className="panel animate-fade">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            Attendance Ledger
          </h3>

          <p
            style={{
              color: '#6b7280',
              fontSize: '13px',
              marginTop: '5px'
            }}
          >
            Your attendance records grouped by date.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px'
          }}
        >
          <span className="status-pill approved">
            Present: {totalPresent}
          </span>

          <span className="status-pill rejected">
            Absent: {totalAbsent}
          </span>
        </div>
      </div>

      {dateWiseAttendance.length === 0 ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#9ca3af',
            border: '1px dashed #d1d5db',
            borderRadius: '10px'
          }}
        >
          No attendance records available.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {dateWiseAttendance.map(day => (
            <div
              key={day.date}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#ffffff'
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  background: '#f5f3ff',
                  borderBottom: '1px solid #ddd6fe',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: '700',
                      color: '#4c1d95',
                      fontSize: '15px'
                    }}
                  >
                    {formatAttendanceDate(day.date)}
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '3px'
                    }}
                  >
                    {day.records.length}{' '}
                    class/session record
                    {day.records.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}
                >
                  Attendance Date
                </span>
              </div>

              <table
                className="erp-table"
                style={{
                  margin: 0
                }}
              >
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {day.records.map((log, index) => (
                    <tr
                      key={`${day.date}-${log.subject}-${index}`}
                    >
                      <td>
                        <strong>
                          {log.subject}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${
                            log.status === 'Present'
                              ? 'approved'
                              : 'rejected'
                          }`}
                        >
                          {log.status === 'Present'
                            ? '✓ Present'
                            : '✕ Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}