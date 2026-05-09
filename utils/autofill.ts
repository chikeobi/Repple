import type { AutofillHints } from './types';

const MAKES = [
  'Acura',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Buick',
  'Cadillac',
  'Chevrolet',
  'Chrysler',
  'Dodge',
  'Ford',
  'Genesis',
  'GMC',
  'Honda',
  'Hyundai',
  'Infiniti',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Lincoln',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Porsche',
  'Ram',
  'Subaru',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

const MAKE_PATTERN = MAKES.map((make) => make.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join(
  '|',
);
const YEAR_VEHICLE_REGEX = new RegExp(
  `\\b(?:19|20)\\d{2}\\s+(?:${MAKE_PATTERN})\\s+[A-Z0-9][\\w-]*(?:\\s+[A-Z0-9][\\w-]*){0,2}\\b`,
  'g',
);
const CUED_VEHICLE_REGEX = new RegExp(
  `\\b(?:${MAKE_PATTERN})\\s+[A-Z0-9][\\w-]*(?:\\s+[A-Z0-9][\\w-]*){0,2}\\b`,
  'g',
);

const RELATIVE_TIME_REGEX =
  /\b(?:today|tomorrow|tonight|this\s+(?:morning|afternoon|evening)|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/;
const MONTH_TIME_REGEX =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/;
const NUMERIC_TIME_REGEX =
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/;
const TIME_ONLY_REGEX = /\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\b/;
const NAME_BLACKLIST = new Set([
  'Appointment',
  'Appointments',
  'Contact',
  'Customer',
  'Dealership',
  'Ford',
  'Honda',
  'Manager',
  'Motors',
  'Nissan',
  'Repple',
  'Reserved',
  'Sales',
  'Service',
  'Toyota',
  'Vehicle',
]);

function toLines(text: string) {
  const unique = new Set<string>();

  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 2 && line.length <= 140)
    .filter((line) => {
      const normalized = line.toLowerCase();

      if (unique.has(normalized)) {
        return false;
      }

      unique.add(normalized);
      return true;
    });
}

function cleanLabelPrefix(value: string) {
  return value
    .replace(
      /^(?:customer|customer name|client|guest|buyer|lead|prospect|name|appointment(?: time)?|appt(?: time)?|visit(?: time)?|scheduled(?: for| time)?|time|date|vehicle|car)\s*[:\-]\s*/i,
      '',
    )
    .trim();
}

function isLikelyPersonName(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 0 || parts.length > 3) {
    return false;
  }

  return parts.every((part) => {
    if (!/^[A-Z][a-z'-]+$/.test(part)) {
      return false;
    }

    return !NAME_BLACKLIST.has(part);
  });
}

function extractName(lines: string[], title: string) {
  const labeledPatterns = [
    /\b(?:customer(?: name)?|client|guest|buyer|lead|prospect|name)\s*[:\-]\s*([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})/,
    /\bfor\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})\b/,
  ];

  for (const line of lines) {
    for (const pattern of labeledPatterns) {
      const match = line.match(pattern);

      if (match?.[1] && isLikelyPersonName(match[1])) {
        return match[1].split(/\s+/)[0];
      }
    }
  }

  const titleMatch = title.match(/\b([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})\b/);

  if (titleMatch?.[1] && isLikelyPersonName(titleMatch[1])) {
    return titleMatch[1].split(/\s+/)[0];
  }

  return '';
}

function extractVehicle(lines: string[], text: string) {
  for (const line of lines) {
    if (!/\b(vehicle|car|model|unit|stock|trim)\b/i.test(line)) {
      continue;
    }

    const yearMatch = line.match(YEAR_VEHICLE_REGEX);

    if (yearMatch?.[0]) {
      return yearMatch[0];
    }

    const makeMatch = line.match(CUED_VEHICLE_REGEX);

    if (makeMatch?.[0]) {
      return makeMatch[0];
    }
  }

  const yearMatch = text.match(YEAR_VEHICLE_REGEX);

  if (yearMatch?.[0]) {
    return yearMatch[0];
  }

  return '';
}

function extractDateTimeFragment(line: string) {
  const cleanedLine = cleanLabelPrefix(line);

  return (
    cleanedLine.match(RELATIVE_TIME_REGEX)?.[0] ??
    cleanedLine.match(MONTH_TIME_REGEX)?.[0] ??
    cleanedLine.match(NUMERIC_TIME_REGEX)?.[0] ??
    (/\b(appointment|appt|visit|scheduled|delivery|meeting|time|date)\b/i.test(line)
      ? cleanedLine
      : cleanedLine.match(TIME_ONLY_REGEX)?.[0]) ??
    ''
  );
}

function extractAppointmentTime(lines: string[]) {
  for (const line of lines) {
    if (!/\b(appointment|appt|visit|scheduled|delivery|meeting|time|date)\b/i.test(line)) {
      continue;
    }

    const fragment = extractDateTimeFragment(line);

    if (fragment) {
      return fragment;
    }
  }

  for (const line of lines) {
    const fragment = extractDateTimeFragment(line);

    if (fragment) {
      return fragment;
    }
  }

  return '';
}

export function extractAutofillHints(text: string, title = ''): AutofillHints {
  const limitedText = text.slice(0, 20000);
  const lines = toLines(limitedText);

  return {
    firstName: extractName(lines, title),
    vehicle: extractVehicle(lines, limitedText),
    appointmentTime: extractAppointmentTime(lines),
    sourceTitle: title.trim(),
  };
}
