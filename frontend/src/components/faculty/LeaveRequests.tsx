import React from 'react';
import { Check, X } from 'lucide-react';

import {
  LeaveRequest
} from '../../types';

interface LeaveRequestsProps {
  leaveRequests: LeaveRequest[];
  fetchERPData: () => void;
}

export default function LeaveRequests({
  leaveRequests,
  fetchERPData
}: LeaveRequestsProps) {
  const handleFacultyLeaveAction = async (
    leaveId: string,
    status: 'Approved' | 'Rejected'
  ) => {
    const token = localStorage.getItem(
      'erp_session_token'
    );

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
          data.message || 'Leave action failed.'
        );
      }

      alert(
        `Leave application resolved: ${status}`
      );

      fetchERPData();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.';

      alert(`Failed: ${message}`);
    }
  };

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
          {leaveRequests.map((request) => (
            <tr key={request.id}>
              <td>
                <code>
                  {request.id}
                </code>
              </td>

              <td>
                <strong>
                  {request.studentName ||
                    request.studentId}
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
                      <Check size={14} />
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
                      <X size={14} />
                      Deny
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}