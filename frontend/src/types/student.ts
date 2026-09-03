import { AttendanceHistoryItem } from './attendance';

export interface AcademicNote {
  id: number;
  subject: string;
  title: string;
  date: string;
  size: string;
  filePath?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName?: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface StudentMetadata {
  id: string;
  name: string;
  section: string;
  email?: string;
}

export interface FacultyMember {
  faculty_id: number;
  username: string;
  name: string;
}

export interface Assignment {
  id: number;
  section: string;
  subject_name: string;
  faculty_username: string;
}

export interface ERPDashboardData {
  subjects: string[];
  studentRecords: StudentMetadata[];
  sharedNotes: AcademicNote[];
  leaveRequests: LeaveRequest[];
  facultyList?: FacultyMember[];
  assignments?: Assignment[];
  attendanceLogs?: AttendanceHistoryItem[];
}

export interface UserSession {
  username: string;
  name: string;
  role: 'admin' | 'faculty' | 'student';
  studentId?: string;
  facultyId?: number;
}