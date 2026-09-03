import React, { useState } from 'react';

import {
  FacultyMember,
  Assignment
} from '../../types';

interface AssignFacultyProps {
  subjects: string[];
  facultyList?: FacultyMember[];
  assignments?: Assignment[];
  fetchERPData: () => void;
}

export default function AssignFaculty({
  subjects,
  facultyList,
  assignments,
  fetchERPData
}: AssignFacultyProps) {
  const [newAssign, setNewAssign] = useState({
    section: 'A',
    subject: 'Data Science',
    faculty: 'faculty1'
  });

  const handleAssignFaculty = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const token =
      localStorage.getItem(
        'erp_session_token'
      );

    fetch(
      'http://localhost:5000/api/admin/assign-faculty',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          section: newAssign.section,
          subject: newAssign.subject,
          facultyUsername: newAssign.faculty
        })
      }
    )
      .then((res) => res.json())
      .then(() => {
        alert(
          'Faculty mapping allocation updated.'
        );

        fetchERPData();
      });
  };

  return (
    <div className="panel animate-fade">
      <h3>
        Course Allocation &
        Section Mappings
      </h3>

      <form
        onSubmit={handleAssignFaculty}
        style={{
          maxWidth: '500px',
          marginTop: '16px'
        }}
      >
        <div className="form-group">
          <label>
            Target Section
          </label>

          <select
            value={newAssign.section}
            onChange={(e) =>
              setNewAssign({
                ...newAssign,
                section: e.target.value
              })
            }
          >
            <option value="A">
              Section A
            </option>

            <option value="B">
              Section B
            </option>

            <option value="C">
              Section C
            </option>
          </select>
        </div>

        <div
          className="form-group"
          style={{
            marginTop: '12px'
          }}
        >
          <label>
            Academic Module
          </label>

          <select
            value={newAssign.subject}
            onChange={(e) =>
              setNewAssign({
                ...newAssign,
                subject: e.target.value
              })
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
            marginTop: '12px'
          }}
        >
          <label>
            Faculty Instructor
          </label>

          <select
            value={newAssign.faculty}
            onChange={(e) =>
              setNewAssign({
                ...newAssign,
                faculty: e.target.value
              })
            }
          >
            {facultyList?.map((faculty) => (
              <option
                key={faculty.username}
                value={faculty.username}
              >
                {faculty.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{
            marginTop: '20px'
          }}
        >
          Deploy Mapping
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
            <th>
              Section
            </th>

            <th>
              Course Subject
            </th>

            <th>
              Responsible Faculty
            </th>
          </tr>
        </thead>

        <tbody>
          {assignments?.map(
            (assignment) => (
              <tr
                key={assignment.id}
              >
                <td>
                  Section{' '}
                  {assignment.section}
                </td>

                <td>
                  {assignment.subject_name}
                </td>

                <td>
                  <code>
                    {
                      assignment.faculty_username
                    }
                  </code>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
