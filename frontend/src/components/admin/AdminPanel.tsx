import React from 'react';

import AddStudent from './AddStudent';
import AddFaculty from './AddFaculty';
import AssignFaculty from './AssignFaculty';

import { ERPDashboardData } from '../../types';

interface AdminPanelProps {
  dbData: ERPDashboardData;
  currentView: string;
  fetchERPData: () => void;
  exportTableToCSV: (
    datasetType:
      | 'students'
      | 'attendance'
      | 'leaves'
  ) => void;
}

export default function AdminPanel({
  dbData,
  currentView,
  fetchERPData,
  exportTableToCSV
}: AdminPanelProps) {
  if (
    currentView ===
    'admin-addStudent'
  ) {
    return (
      <AddStudent
        studentRecords={
          dbData.studentRecords
        }
        fetchERPData={
          fetchERPData
        }
        exportTableToCSV={
          exportTableToCSV
        }
      />
    );
  }

  if (
    currentView ===
    'admin-addFaculty'
  ) {
    return (
      <AddFaculty
        facultyList={
          dbData.facultyList
        }
        fetchERPData={
          fetchERPData
        }
      />
    );
  }

  if (
    currentView ===
    'admin-assignFaculty'
  ) {
    return (
      <AssignFaculty
        subjects={
          dbData.subjects
        }
        facultyList={
          dbData.facultyList
        }
        assignments={
          dbData.assignments
        }
        fetchERPData={
          fetchERPData
        }
      />
    );
  }

  return null;
}
