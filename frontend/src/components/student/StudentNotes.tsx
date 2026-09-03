import React from 'react';
import { Download } from 'lucide-react';

import {
  AcademicNote
} from '../../types';

interface StudentNotesProps {
  sharedNotes: AcademicNote[];
}

export default function StudentNotes({
  sharedNotes
}: StudentNotesProps) {
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
          {sharedNotes.map(note => (
            <tr key={note.id}>
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
                    <Download size={14} />
                    Get Asset
                  </a>
                ) : (
                  <span
                    style={{
                      color: '#9ca3af'
                    }}
                  >
                    No file linked
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}