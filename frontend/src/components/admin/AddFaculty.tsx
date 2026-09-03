import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

import { FacultyMember } from '../../types';

interface AddFacultyProps {
  facultyList?: FacultyMember[];
  fetchERPData: () => void;
}

export default function AddFaculty({
  facultyList,
  fetchERPData
}: AddFacultyProps) {
  const [newFaculty, setNewFaculty] = useState({
    name: '',
    user: '',
    pass: ''
  });

  const handleAddFaculty = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const token =
      localStorage.getItem(
        'erp_session_token'
      );

    fetch(
      'http://localhost:5000/api/admin/add-faculty',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFaculty.name,
          username: newFaculty.user,
          password: newFaculty.pass
        })
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(
            `Faculty ${newFaculty.name} registered successfully.`
          );

          setNewFaculty({
            name: '',
            user: '',
            pass: ''
          });

          fetchERPData();
        } else {
          alert(
            `Failed: ${data.message}`
          );
        }
      })
      .catch((err) => {
        console.error(err);

        alert(
          'Failed to create faculty account.'
        );
      });
  };

  return (
    <div className="panel animate-fade">
      <h3>
        Add New Faculty Member
      </h3>

      <p
        style={{
          color: '#6b7280',
          fontSize: '13px',
          marginBottom: '24px'
        }}
      >
        Create a faculty profile and
        login credentials for the
        faculty portal.
      </p>

      <form
        onSubmit={handleAddFaculty}
        style={{
          maxWidth: '500px'
        }}
      >
        <div className="form-group">
          <label>
            Full Name
          </label>

          <input
            type="text"
            value={newFaculty.name}
            onChange={(e) =>
              setNewFaculty({
                ...newFaculty,
                name: e.target.value
              })
            }
            placeholder="Dr. Ramesh Kumar"
            required
          />
        </div>

        <div
          className="form-group"
          style={{
            marginTop: '16px'
          }}
        >
          <label>
            Faculty Username
          </label>

          <input
            type="text"
            value={newFaculty.user}
            onChange={(e) =>
              setNewFaculty({
                ...newFaculty,
                user: e.target.value
              })
            }
            placeholder="ramesh"
            required
          />
        </div>

        <div
          className="form-group"
          style={{
            marginTop: '16px'
          }}
        >
          <label>
            Initial Password
          </label>

          <input
            type="password"
            value={newFaculty.pass}
            onChange={(e) =>
              setNewFaculty({
                ...newFaculty,
                pass: e.target.value
              })
            }
            placeholder="Enter initial password"
            required
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{
            marginTop: '20px'
          }}
        >
          <PlusCircle size={16} />
          Register Faculty
        </button>
      </form>

      <hr
        style={{
          margin: '30px 0',
          border: '0',
          borderTop:
            '1px solid #e5e7eb'
        }}
      />

      <h4>
        Registered Faculty
      </h4>

      <table
        className="erp-table"
        style={{
          marginTop: '16px'
        }}
      >
        <thead>
          <tr>
            <th>
              Faculty ID
            </th>

            <th>
              Name
            </th>

            <th>
              Username
            </th>
          </tr>
        </thead>

        <tbody>
          {facultyList?.map(
            (faculty) => (
              <tr
                key={
                  faculty.faculty_id
                }
              >
                <td>
                  <code>
                    {
                      faculty.faculty_id
                    }
                  </code>
                </td>

                <td>
                  <strong>
                    {faculty.name}
                  </strong>
                </td>

                <td>
                  <code>
                    {
                      faculty.username
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
