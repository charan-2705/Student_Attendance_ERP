export type AttendanceStatus =
  | 'Present'
  | 'Absent';

export interface AttendanceHistoryItem {
  studentId: string;
  subject: string;
  date: string;
  status: AttendanceStatus;
}

export interface SubjectAttendance {
  subject: string;
  percentage: number;
  present: number;
  absent: number;
  total: number;
}

export interface DateWiseAttendance {
  date: string;
  records: AttendanceHistoryItem[];
}