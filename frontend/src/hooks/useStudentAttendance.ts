import { useMemo } from 'react';

import {
  AttendanceHistoryItem,
  SubjectAttendance,
  DateWiseAttendance
} from '../types';

interface UseStudentAttendanceProps {
  attendanceLogs?: AttendanceHistoryItem[];
  studentId?: string;
}

export default function useStudentAttendance({
  attendanceLogs,
  studentId
}: UseStudentAttendanceProps) {
  const studentAttendanceLogs =
    useMemo(() => {
      if (
        !attendanceLogs ||
        !studentId
      ) {
        return [];
      }

      const currentStudentId =
        String(studentId)
          .trim()
          .toLowerCase();

      return attendanceLogs.filter(
        log =>
          String(
            log.studentId || ''
          )
            .trim()
            .toLowerCase() ===
          currentStudentId
      );
    }, [
      attendanceLogs,
      studentId
    ]);

  const overallAttendance =
    useMemo(() => {
      if (
        studentAttendanceLogs.length ===
        0
      ) {
        return 0;
      }

      const presentCount =
        studentAttendanceLogs.filter(
          log =>
            log.status === 'Present'
        ).length;

      return Math.round(
        (
          presentCount /
          studentAttendanceLogs.length
        ) * 100
      );
    }, [
      studentAttendanceLogs
    ]);

  const subjectAttendanceData =
    useMemo(() => {
      const subjectMap: Record<
        string,
        {
          total: number;
          present: number;
        }
      > = {};

      studentAttendanceLogs.forEach(
        log => {
          const subject =
            String(
              log.subject ||
                'Unknown'
            ).trim();

          if (!subjectMap[subject]) {
            subjectMap[subject] = {
              total: 0,
              present: 0
            };
          }

          subjectMap[subject].total +=
            1;

          if (
            log.status === 'Present'
          ) {
            subjectMap[
              subject
            ].present += 1;
          }
        }
      );

      return Object.entries(
        subjectMap
      )
        .map(
          ([subject, values]) => ({
            subject,
            percentage:
              values.total === 0
                ? 0
                : Math.round(
                    (
                      values.present /
                      values.total
                    ) * 100
                  ),
            present:
              values.present,
            absent:
              values.total -
              values.present,
            total:
              values.total
          } as SubjectAttendance)
        )
        .sort(
          (a, b) =>
            b.percentage -
            a.percentage
        );
    }, [
      studentAttendanceLogs
    ]);

  const dateWiseAttendance =
    useMemo(() => {
      const grouped: Record<
        string,
        AttendanceHistoryItem[]
      > = {};

      studentAttendanceLogs.forEach(
        log => {
          const date =
            String(
              log.date || ''
            ).trim();

          if (!grouped[date]) {
            grouped[date] = [];
          }

          grouped[date].push(log);
        }
      );

      return Object.entries(
        grouped
      )
        .sort(
          ([dateA], [dateB]) =>
            new Date(
              dateB
            ).getTime() -
            new Date(
              dateA
            ).getTime()
        )
        .map(
          ([date, records]) =>
            ({
              date,
              records:
                records.sort(
                  (a, b) =>
                    a.subject.localeCompare(
                      b.subject
                    )
                )
            } as DateWiseAttendance)
        );
    }, [
      studentAttendanceLogs
    ]);

  const totalPresent =
    studentAttendanceLogs.filter(
      log =>
        log.status === 'Present'
    ).length;

  const totalAbsent =
    studentAttendanceLogs.filter(
      log =>
        log.status === 'Absent'
    ).length;

  const totalConducted =
    studentAttendanceLogs.length;

  const formatAttendanceDate = (
    dateString: string
  ) => {
    if (!dateString) {
      return 'Unknown Date';
    }

    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateString;
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  return {
    studentAttendanceLogs,
    overallAttendance,
    subjectAttendanceData,
    dateWiseAttendance,
    totalPresent,
    totalAbsent,
    totalConducted,
    formatAttendanceDate
  };
}