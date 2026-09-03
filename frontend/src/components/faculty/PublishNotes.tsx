import React, { useState } from 'react';

interface PublishNotesProps {
  subjects: string[];
  fetchERPData: () => void;
}

export default function PublishNotes({
  subjects,
  fetchERPData
}: PublishNotesProps) {
  const [noteTitle, setNoteTitle] =
    useState('');

  const [noteSubject, setNoteSubject] =
    useState('Data Science');

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const handleFacultyPostNote =
    async (e: React.FormEvent) => {
      e.preventDefault();

      const token =
        localStorage.getItem(
          'erp_session_token'
        );

      const formData =
        new FormData();

      formData.append(
        'title',
        noteTitle
      );

      formData.append(
        'subject',
        noteSubject
      );

      if (selectedFile) {
        formData.append(
          'attachedFile',
          selectedFile
        );
      }

      try {
        const response =
          await fetch(
            'http://localhost:5000/api/faculty/post-note',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Failed to publish document.'
          );
        }

        alert(
          'Academic file shared successfully.'
        );

        setNoteTitle('');
        setSelectedFile(null);

        fetchERPData();
      } catch (error) {
        console.error(error);

        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';

        alert(
          `Failed to publish document: ${message}`
        );
      }
    };

  return (
    <div className="panel animate-fade">
      <h3>
        Publish Academic Materials
      </h3>

      <form
        onSubmit={handleFacultyPostNote}
        style={{
          maxWidth: '500px',
          marginTop: '16px'
        }}
      >
        <div className="form-group">
          <label>
            Document Title
          </label>

          <input
            type="text"
            value={noteTitle}
            onChange={(e) =>
              setNoteTitle(e.target.value)
            }
            placeholder="Lecture notes reference..."
            required
          />
        </div>

        <div
          className="form-group"
          style={{
            marginTop: '12px'
          }}
        >
          <label>
            Subject Stream
          </label>

          <select
            value={noteSubject}
            onChange={(e) =>
              setNoteSubject(e.target.value)
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
            Upload File
          </label>

          <input
            type="file"
            onChange={(e) =>
              setSelectedFile(
                e.target.files
                  ? e.target.files[0]
                  : null
              )
            }
            style={{
              border:
                '1px dashed #ccc',
              width: '100%',
              padding: '10px'
            }}
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          style={{
            marginTop: '20px'
          }}
        >
          Publish Document
        </button>
      </form>
    </div>
  );
}