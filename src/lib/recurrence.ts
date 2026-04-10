import { addDays, addWeeks, addMonths, setDate, getDay, startOfDay, differenceInCalendarWeeks, isBefore, isAfter } from "date-fns";

export interface RecurrenceConfig {
  type: "daily" | "weekly" | "monthly";
  interval: number;
  days: number[]; // 0-6
  dayOfMonth: number; // 1-31
}

export function calculateNextRecurrence(config: RecurrenceConfig, from: Date = new Date()): Date {
  const fromClean = startOfDay(from);

  if (config.type === "daily") {
    return addDays(fromClean, config.interval);
  }

  if (config.type === "weekly") {
    // We search for the next available day in the recurrence pattern
    let candidate = addDays(fromClean, 1);
    const startWeek = fromClean;

    for (let i = 0; i < 366; i++) {
      const dayOfWeek = getDay(candidate);
      if (config.days.includes(dayOfWeek)) {
        // Check if the week of the candidate respects the interval
        const weeksDiff = differenceInCalendarWeeks(candidate, startWeek, { weekStartsOn: 0 });
        if (weeksDiff % config.interval === 0) {
          return candidate;
        }
      }
      candidate = addDays(candidate, 1);
    }
  }

  if (config.type === "monthly") {
    let candidate = addMonths(fromClean, config.interval);
    candidate = setDate(candidate, config.dayOfMonth);
    
    // If we're already past that day in the target month (unlikely with interval >= 1, but for safety)
    if (isBefore(candidate, addDays(fromClean, 1))) {
       candidate = addMonths(candidate, 1);
       candidate = setDate(candidate, config.dayOfMonth);
    }
    return candidate;
  }

  return addDays(fromClean, 1);
}
