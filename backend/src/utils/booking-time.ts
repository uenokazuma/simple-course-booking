const LEAD_TIME_UNITS = new Set(['HOUR', 'DAY', 'WEEK']);

export function getLeadTimeMilliseconds(value: string, unit: string): number {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw Object.assign(new Error('booking_lead_time_value must be a non-negative integer'), { statusCode: 500 });
  }

  if (!LEAD_TIME_UNITS.has(unit)) {
    throw Object.assign(new Error('booking_lead_time_unit must be HOUR, DAY, or WEEK'), { statusCode: 500 });
  }

  const unitMilliseconds = {
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
  } as const;

  return numericValue * unitMilliseconds[unit as keyof typeof unitMilliseconds];
}