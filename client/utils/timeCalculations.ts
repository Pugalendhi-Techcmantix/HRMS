/**
 * Parse time string in 12-hour format (e.g., "06:59 PM", "09:06 AM")
 */
export function parseTime(timeStr: string | undefined): Date {
  if (!timeStr || typeof timeStr !== 'string') {
    return new Date();
  }

  const [time, period] = timeStr.trim().split(' ');
  if (!time || !period) {
    return new Date();
  }

  const [hours, minutes] = time.split(':').map(Number);
  
  let hour = hours;
  if (period === 'PM' && hours !== 12) {
    hour = hours + 12;
  } else if (period === 'AM' && hours === 12) {
    hour = 0;
  }
  
  const date = new Date();
  date.setHours(hour, minutes, 0, 0);
  return date;
}

/**
 * Calculate total hours between check-in and check-out times
 * Returns { totalHours, breakHours }
 */
export function calculateWorkingHours(times: string[]): {
  totalHours: number;
  breakHours: number;
  workingHours: number;
  records: Array<{ checkIn: string; checkOut: string; duration: number }>;
} {
  if (times.length < 2) {
    return { totalHours: 0, breakHours: 0, workingHours: 0, records: [] };
  }

  const sortedTimes = times.map(parseTime).sort((a, b) => a.getTime() - b.getTime());
  const records: Array<{ checkIn: string; checkOut: string; duration: number }> = [];

  let totalMinutes = 0;
  let breakMinutes = 0;

  // Pair check-ins and check-outs
  for (let i = 0; i < sortedTimes.length - 1; i += 2) {
    const checkIn = sortedTimes[i];
    const checkOut = sortedTimes[i + 1];
    const durationMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);

    if (durationMinutes > 0) {
      totalMinutes += durationMinutes;
      records.push({
        checkIn: formatTime(checkIn),
        checkOut: formatTime(checkOut),
        duration: parseFloat((durationMinutes / 60).toFixed(2)),
      });
    }
  }

  // Calculate break hours (assume lunch/breaks between records)
  if (records.length > 1) {
    for (let i = 0; i < records.length - 1; i++) {
      const checkOutTime = parseTime(records[i].checkOut);
      const nextCheckInTime = parseTime(records[i + 1].checkIn);
      const breakDuration = (nextCheckInTime.getTime() - checkOutTime.getTime()) / (1000 * 60);
      
      if (breakDuration > 0) {
        breakMinutes += breakDuration;
      }
    }
  }

  const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
  const breakHours = parseFloat((breakMinutes / 60).toFixed(2));
  const workingHours = parseFloat((totalHours - breakHours).toFixed(2));

  return { totalHours, breakHours, workingHours, records };
}

/**
 * Format date to time string (HH:MM AM/PM)
 */
export function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours > 12) {
    hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse CSV/Excel data and extract time entries
 */
export function parseExcelData(text: string): Array<{
  sNo: number;
  name: string;
  regNo: string;
  date: string;
  time: string;
}> {
  const lines = text.trim().split('\n');
  const data = [];

  for (const line of lines) {
    const columns = line.split('\t');
    if (columns.length >= 5) {
      const sNo = parseInt(columns[0]);
      if (!isNaN(sNo)) {
        data.push({
          sNo,
          name: columns[1]?.trim() || '',
          regNo: columns[2]?.trim() || '',
          date: columns[3]?.trim() || '',
          time: columns[4]?.trim() || '',
        });
      }
    }
  }

  return data;
}
