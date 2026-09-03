import React, { useState } from 'react';
import { Users } from 'lucide-react';

import {
  StudentMetadata
} from '../../types';

interface RollCallProps {
  subjects: string[];
  orderedStudentRecords: StudentMetadata[];
  attendanceRoll: Record<string, 'Present' | 'Absent'>;
  setAttendanceRoll: React.Dispatch<
    React.SetStateAction<
      Record<string, 'Present' | 'Absent'>
    >
  >;
  selectedSubject: string;
  setSelectedSubject: React.Dispatch<
    React.SetStateAction<string>
  >;
  attendanceDate: string;
  setAttendanceDate: React.Dispatch<
    React.SetStateAction<string>
  >;
  submitAttendance: (
    e: React.FormEvent
  ) => Promise<void>;
}

export default function RollCall({
  subjects,
  orderedStudentRecords,
  attendanceRoll,
  setAttendanceRoll,
  selectedSubject,
  setSelectedSubject,
  attendanceDate,
  setAttendanceDate,
  submitAttendance
}: RollCallProps) {
  const [rollSearch, setRollSearch] =
    useState('');

  const presentCount =
    orderedStudentRecords.filter(
      (student) =>
        attendanceRoll[student.id] === 'Present'
    ).length;

  const absentCount =
    orderedStudentRecords.length -
    presentCount;

  const resetRollCall = () => {
    const next: Record<
      string,
      'Present' | 'Absent'
    > = {};

    orderedStudentRecords.forEach((student) => {
      next[student.id] = 'Present';
    });

    setAttendanceRoll(next);
  };

  const markAll = (
    status: 'Present' | 'Absent'
  ) => {
    const next: Record<
      string,
      'Present' | 'Absent'
    > = {};

    orderedStudentRecords.forEach((student) => {
      next[student.id] = status;
    });

    setAttendanceRoll(next);
  };

  const filteredStudents =
    orderedStudentRecords.filter((student) =>
      String(student.id)
        .toUpperCase()
        .includes(rollSearch)
    );

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
            marginBottom: '16px'
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
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#eef5ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1769ff'
              }}
            >
              <Users size={25} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: '#101a3d',
                  fontSize: '24px'
                }}
              >
                Roll Call Attendance
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  color: '#7183a7',
                  fontSize: '15px'
                }}
              >
                Click on a roll number to toggle
                attendance status.
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
              onClick={resetRollCall}
              style={{
                minHeight: '42px',
                padding: '0 15px',
                border: '1px solid #dce5f0',
                background: '#fff',
                borderRadius: '8px',
                color: '#51617f',
                fontWeight: 700
              }}
            >
              ↻&nbsp; Reset
            </button>

            <button
              type="button"
              onClick={() => markAll('Present')}
              style={{
                minHeight: '42px',
                padding: '0 15px',
                border: '1px solid #dce5f0',
                background: '#fff',
                borderRadius: '8px',
                color: '#0a7546',
                fontWeight: 700
              }}
            >
              ✓&nbsp; Mark All Present
            </button>

            <button
              type="button"
              onClick={() => markAll('Absent')}
              style={{
                minHeight: '42px',
                padding: '0 15px',
                border: '1px solid #dce5f0',
                background: '#fff',
                borderRadius: '8px',
                color: '#d51f35',
                fontWeight: 700
              }}
            >
              ×&nbsp; Mark All Absent
            </button>

            <button
              type="submit"
              form="roll-call-form"
              style={{
                minHeight: '42px',
                padding: '0 15px',
                border: 0,
                background: '#2b82f6',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 800
              }}
            >
              ▣&nbsp; Save Attendance
            </button>
          </div>
        </div>

        <form
          id="roll-call-form"
          onSubmit={submitAttendance}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px'
            }}
          >
            <div
              className="form-group"
              style={{
                flex: '1 1 260px'
              }}
            >
              <label>Course Module</label>

              <select
                value={selectedSubject}
                onChange={(e) =>
                  setSelectedSubject(e.target.value)
                }
              >
                {subjects.map((subject) => (
                  <option
                    key={subject}
                    value={subject}
                  >
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="form-group"
              style={{
                flex: '1 1 220px'
              }}
            >
              <label>Run Date</label>

              <input
                type="date"
                value={attendanceDate}
                onChange={(e) =>
                  setAttendanceDate(e.target.value)
                }
                required
              />
            </div>

            <div
              style={{
                flex: '1 1 260px',
                display: 'flex',
                alignItems: 'flex-end'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '12px',
                    color: '#7585a4'
                  }}
                >
                  ⌕
                </span>

                <input
                  type="search"
                  value={rollSearch}
                  onChange={(e) =>
                    setRollSearch(
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Search roll number..."
                  style={{
                    width: '100%',
                    height: '44px',
                    border: '1px solid #dce5f0',
                    borderRadius: '8px',
                    padding: '0 14px 0 36px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '14px'
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  padding: '11px 18px',
                  borderRadius: '9px',
                  background: '#f0fff7',
                  border: '1px solid #d1f2e0',
                  color: '#08733f',
                  fontWeight: 800
                }}
              >
                ✓&nbsp; {presentCount} Present
              </div>

              <div
                style={{
                  padding: '11px 18px',
                  borderRadius: '9px',
                  background: '#fff4f4',
                  border: '1px solid #ffd3d3',
                  color: '#dc1f35',
                  fontWeight: 800
                }}
              >
                ×&nbsp; {absentCount} Absent
              </div>

              <div
                style={{
                  padding: '11px 18px',
                  borderRadius: '9px',
                  background: '#f6f8fb',
                  border: '1px solid #e0e7f0',
                  color: '#17213f',
                  fontWeight: 800
                }}
              >
                Total: {orderedStudentRecords.length}
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
            {filteredStudents.map((student) => {
              const isPresent =
                attendanceRoll[student.id] ===
                'Present';

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() =>
                    setAttendanceRoll(
                      (previous) => ({
                        ...previous,
                        [student.id]: isPresent
                          ? 'Absent'
                          : 'Present'
                      })
                    )
                  }
                  aria-label={student.id}
                  aria-pressed={isPresent}
                  style={{
                    minWidth: 0,
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '5px',
                    border: isPresent
                      ? '1px solid #a9e9c8'
                      : '1px solid #ffb8bd',
                    background: isPresent
                      ? '#effcf5'
                      : '#fff2f3',
                    color: isPresent
                      ? '#143f2c'
                      : '#c91f35',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '0 4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box'
                  }}
                >
                  {student.id}
                </button>
              );
            })}
          </div>
        </form>
      </div>
    </div>
  );
}