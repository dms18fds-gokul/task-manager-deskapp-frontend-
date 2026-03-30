
/**
 * Utility for synchronizing Task Priority and Deadlines.
 * Logic:
 * - Saturday is a working day; only Sunday is skipped.
 * - 0 or 1 working days away -> Very High
 * - 2 working days away -> High
 * - 3 working days away -> Medium
 * - 4 working days away -> Low
 * - 5+ working days away -> Very Low
 */

/**
 * Normalizes a date to YYYY-MM-DD string for comparison.
 * Handles YYYY-MM-DD and DD-MM-YYYY.
 */
function toDateStr(date) {
    if (!date) return "";
    if (typeof date !== 'string') {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }
    
    // Check if format is DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [d, m, y] = date.split('-');
        return `${y}-${m}-${d}`;
    }
    
    // Assume YYYY-MM-DD
    return date.split('T')[0];
}

/**
 * Calculate number of working days between two dates, skipping Sundays.
 * If start and end are same day, returns 0.
 */
export function calculateWorkingDays(startDate, endDate) {
    const startStr = toDateStr(startDate);
    const endStr = toDateStr(endDate);
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (end <= start) return 0;

    let count = 0;
    let current = new Date(start);
    current.setDate(current.getDate() + 1); // Start counting from the next day

    while (current <= end) {
        if (current.getDay() !== 0) { // Skip Sunday
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Calculate deadline date given a start date and number of working days.
 */
export function addWorkingDays(startDate, days) {
    const startStr = toDateStr(startDate);
    let current = new Date(startStr);
    let remaining = days;

    while (remaining > 0) {
        current.setDate(current.getDate() + 1);
        if (current.getDay() !== 0) { // Skip Sunday
            remaining--;
        }
    }
    return toDateStr(current);
}

/**
 * Get Priority string from working days remaining.
 */
export function getPriorityFromDays(days) {
    if (days === 0) return "Very High";
    if (days === 1) return "High";
    if (days === 2) return "Medium";
    if (days === 3) return "Low";
    return "Very Low";
}

const PRIORITY_DAYS = {
    "Very High": 0,
    "High": 1,
    "Medium": 2,
    "Low": 3,
    "Very Low": 4
};

/**
 * Sync logic: Priority -> Date
 */
export function syncPriorityToDate(priority, now = new Date()) {
    const p = typeof priority === 'string' ? priority.trim() : priority;
    const days = PRIORITY_DAYS[p] ?? 4;
    return addWorkingDays(now, days);
}

/**
 * Sync logic: Date -> Priority
 */
export function syncDateToPriority(deadlineDateStr, now = new Date()) {
    if (!deadlineDateStr) return "Medium";
    const days = calculateWorkingDays(now, deadlineDateStr);
    return getPriorityFromDays(days);
}
