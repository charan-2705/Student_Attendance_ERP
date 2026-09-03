import React, { useState } from 'react';

import {
  LeaveRequest
} from '../../types';

interface StudentLeaveProps {
  leaveRequests: LeaveRequest[];
  studentId?: string;
  fetchERPData: () => void;
}

export default function StudentLeave({
  leaveRequests,
  studentId,
  fetchERPData
}: StudentLeaveProps) {
  const [leaveReason, setLeaveReason] =
    useState('');

  const [leaveStart, setLeaveStart] =
    useState('');

  const [leaveEnd, setLeaveEnd] =
    useState('');

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
          'Content-Type':
            'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId,
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

  const currentStudentId =
    String(studentId || '')
      .trim()
      .toLowerCase();

  const studentLeaveRequests =
    leaveRequests?.filter(
      request =>
        String(
          request.studentId || ''
        )
          .trim()
          .toLowerCase() ===
        currentStudentId
    ) || [];

  return (
    <div className="panel animate-fade">

      <form
        onSubmit={handleLeaveSubmit}
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
          {studentLeaveRequests.map(
            request => (
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
            )
          )}
        </tbody>
      </table>

    </div>
  );
}