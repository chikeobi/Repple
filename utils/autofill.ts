import type { AutofillConfidence, AutofillField, AutofillFieldMeta, AutofillHints } from './types';

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

const DEALER_TERMS = [
  'Acura',
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
  'Motors',
  'Auto Group',
  'Automotive',
];

const MAKE_PATTERN = MAKES.map((make) => make.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join(
  '|',
);
const DEALER_PATTERN = DEALER_TERMS.map((term) =>
  term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'),
).join('|');
const YEAR_VEHICLE_REGEX = new RegExp(
  `\\b(?:19|20)\\d{2}\\s+(?:${MAKE_PATTERN})\\s+[A-Z0-9][\\w-]*(?:\\s+[A-Z0-9][\\w-]*){0,4}\\b`,
  'g',
);
const CUED_VEHICLE_REGEX = new RegExp(
  `\\b(?:${MAKE_PATTERN})\\s+[A-Z0-9][\\w-]*(?:\\s+[A-Z0-9][\\w-]*){0,4}\\b`,
  'g',
);
const DEALERSHIP_OF_REGEX = new RegExp(
  `\\b(?:${MAKE_PATTERN})\\s+of\\s+[A-Z][\\w&'.-]*(?:\\s+[A-Z][\\w&'.-]*){0,4}\\b`,
);
const DEALERSHIP_SUFFIX_REGEX = new RegExp(
  `\\b[A-Z][\\w&'.-]*(?:\\s+[A-Z][\\w&'.-]*){0,5}\\s+(?:${DEALER_PATTERN})\\b`,
);
const STREET_SUFFIX_PATTERN =
  'Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Court|Ct|Circle|Cir|Parkway|Pkwy|Highway|Hwy|Freeway|Fwy|Way|Place|Pl|Loop|Terrace|Ter';
const ADDRESS_REGEX = new RegExp(
  `\\b\\d{1,5}\\s+[A-Z0-9][\\w.#'-]*(?:\\s+[A-Z0-9][\\w.#'-]*){0,6}\\s+(?:${STREET_SUFFIX_PATTERN})\\b(?:,?\\s+[A-Z][a-zA-Z'.-]+(?:\\s+[A-Z][a-zA-Z'.-]+){0,3})?(?:,\\s*[A-Z]{2})?(?:\\s+\\d{5}(?:-\\d{4})?)?`,
  'i',
);
const RELATIVE_TIME_REGEX =
  /\b(?:today|tomorrow|tonight|this\s+(?:morning|afternoon|evening)|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/i;
const WEEKDAY_TIME_REGEX =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,\s+|\s+)(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\s*\d{0,2}(?:,\s*\d{4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/i;
const MONTH_TIME_REGEX =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/i;
const NUMERIC_TIME_REGEX =
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?\b/i;
const TIME_ONLY_REGEX = /\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\b/i;
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
  'Store',
  'Toyota',
  'Vehicle',
]);

type Candidate = {
  value: string;
  confidence: AutofillConfidence;
  matchedBy: string;
  score: number;
};

type FieldResult = {
  value: string;
  meta?: AutofillFieldMeta;
};

function isGenericNonDataLine(value: string) {
  return /^(dashboard|leads|appointments|sales queue|inventory|desking|service drive|crm workspace|customer record|vehicle details|appointment details|notes \& activity)$/i.test(
    normalizeWhitespace(value),
  );
}

function toLines(text: string) {
  const unique = new Set<string>();

  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 2 && line.length <= 180)
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
      /^(?:customer|customer name|client|guest|buyer|lead|prospect|name|salesperson|sales person|sales rep|advisor|sales advisor|consultant|appointment(?: time)?|appt(?: time)?|visit(?: time)?|scheduled(?: for| time)?|time|date|vehicle|car|model|dealership|dealer|store|location|address)\s*[:\-]\s*/i,
      '',
    )
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePersonName(value: string) {
  return normalizeWhitespace(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isLikelyPersonName(value: string) {
  const parts = normalizeWhitespace(value).split(/\s+/).filter(Boolean);

  if (parts.length === 0 || parts.length > 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^[A-Z][a-z'-]+$/.test(part)) {
      return false;
    }

    return !NAME_BLACKLIST.has(part);
  });
}

function toConfidence(score: number): AutofillConfidence {
  if (score >= 90) {
    return 'high';
  }

  if (score >= 62) {
    return 'medium';
  }

  return 'low';
}

function maybeAddCandidate(
  candidates: Candidate[],
  value: string,
  score: number,
  matchedBy: string,
  transform?: (candidateValue: string) => string,
) {
  const normalizedValue = normalizeWhitespace(transform ? transform(value) : value);

  if (!normalizedValue || isGenericNonDataLine(normalizedValue)) {
    return;
  }

  const existing = candidates.findIndex(
    (candidate) => candidate.value.toLowerCase() === normalizedValue.toLowerCase(),
  );
  const nextCandidate = {
    value: normalizedValue,
    confidence: toConfidence(score),
    matchedBy,
    score,
  } satisfies Candidate;

  if (existing === -1) {
    candidates.push(nextCandidate);
    return;
  }

  if (candidates[existing].score < score) {
    candidates[existing] = nextCandidate;
  }
}

function pickBestCandidate(candidates: Candidate[]): FieldResult {
  if (candidates.length === 0) {
    return { value: '' };
  }

  const [best] = candidates.sort((left, right) => right.score - left.score);

  return {
    value: best.value,
    meta: {
      confidence: best.confidence,
      matchedBy: best.matchedBy,
    },
  };
}

function extractFirstName(lines: string[], title: string): FieldResult {
  const candidates: Candidate[] = [];
  const namePatterns = [
    {
      pattern:
        /\b(?:customer(?: name)?|client|guest|buyer|lead|prospect|name)\s*[:\-]\s*([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})/,
      score: 96,
      matchedBy: 'labeled customer name',
    },
    {
      pattern: /\b(?:for|guest)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})\b/,
      score: 72,
      matchedBy: 'nearby customer wording',
    },
  ];

  for (const line of lines) {
    for (const patternConfig of namePatterns) {
      const match = line.match(patternConfig.pattern);

      if (match?.[1] && isLikelyPersonName(match[1])) {
        maybeAddCandidate(
          candidates,
          match[1].split(/\s+/)[0],
          patternConfig.score,
          patternConfig.matchedBy,
        );
      }
    }
  }

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!/\bcustomer\b/i.test(lines[index])) {
      continue;
    }

    const nextLine = lines[index + 1];

    if (nextLine && isLikelyPersonName(nextLine)) {
      maybeAddCandidate(candidates, nextLine.split(/\s+/)[0], 84, 'customer heading context');
    }
  }

  const titleMatch = title.match(/\b([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})\b/);

  if (titleMatch?.[1] && isLikelyPersonName(titleMatch[1])) {
    maybeAddCandidate(candidates, titleMatch[1].split(/\s+/)[0], 52, 'page title');
  }

  return pickBestCandidate(candidates);
}

function extractSalesperson(lines: string[], title: string): FieldResult {
  const candidates: Candidate[] = [];
  const patterns = [
    {
      pattern:
        /\b(?:sales(?:\s+person)?|sales rep|sales advisor|advisor|consultant|product specialist|client advisor)\s*[:\-]\s*([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,2})/,
      score: 97,
      matchedBy: 'labeled salesperson',
    },
    {
      pattern:
        /\b(?:with|advisor is|consultant is)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,2})\b/,
      score: 70,
      matchedBy: 'salesperson context',
    },
  ];

  for (const line of lines) {
    for (const patternConfig of patterns) {
      const match = line.match(patternConfig.pattern);

      if (match?.[1] && isLikelyPersonName(match[1])) {
        maybeAddCandidate(
          candidates,
          normalizePersonName(match[1]),
          patternConfig.score,
          patternConfig.matchedBy,
        );
      }
    }
  }

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (
      !/^(?:sales advisor|salesperson|sales person|advisor|consultant|client advisor)$/i.test(
        normalizeWhitespace(lines[index]),
      )
    ) {
      continue;
    }

    const nextLine = lines[index + 1];

    if (nextLine && isLikelyPersonName(nextLine)) {
      maybeAddCandidate(
        candidates,
        normalizePersonName(nextLine),
        88,
        'salesperson heading context',
      );
    }
  }

  for (const line of lines) {
    const contextMatch = line.match(
      /\b(?:scheduled with|advisor is|consultant is|worked with)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,2})\b/i,
    );

    if (contextMatch?.[1] && isLikelyPersonName(contextMatch[1])) {
      maybeAddCandidate(
        candidates,
        normalizePersonName(contextMatch[1]),
        82,
        'salesperson sentence context',
      );
    }
  }

  const titleMatch = title.match(
    /\b(?:advisor|consultant|sales)\s*[:\-]?\s*([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){1,2})/i,
  );

  if (titleMatch?.[1] && isLikelyPersonName(titleMatch[1])) {
    maybeAddCandidate(candidates, normalizePersonName(titleMatch[1]), 50, 'page title');
  }

  return pickBestCandidate(candidates);
}

function extractVehicle(lines: string[], text: string): FieldResult {
  const candidates: Candidate[] = [];

  for (const line of lines) {
    if (/\b(vehicle|car|model|unit|stock|trim)\b/i.test(line)) {
      const yearMatch = line.match(YEAR_VEHICLE_REGEX);
      const makeMatch = line.match(CUED_VEHICLE_REGEX);

      if (yearMatch?.[0]) {
        maybeAddCandidate(candidates, yearMatch[0], 96, 'labeled vehicle year/make/model');
      } else if (makeMatch?.[0]) {
        maybeAddCandidate(candidates, makeMatch[0], 78, 'labeled vehicle make/model');
      }
    }
  }

  const yearMatch = text.match(YEAR_VEHICLE_REGEX);

  if (yearMatch?.[0]) {
    maybeAddCandidate(candidates, yearMatch[0], 68, 'page vehicle year/make/model');
  }

  if (candidates.length === 0) {
    const makeMatch = text.match(CUED_VEHICLE_REGEX);

    if (makeMatch?.[0]) {
      maybeAddCandidate(candidates, makeMatch[0], 52, 'page vehicle make/model');
    }
  }

  return pickBestCandidate(candidates);
}

function extractDateTimeFragment(line: string) {
  const cleanedLine = cleanLabelPrefix(line);

  return (
    cleanedLine.match(RELATIVE_TIME_REGEX)?.[0] ??
    cleanedLine.match(WEEKDAY_TIME_REGEX)?.[0] ??
    cleanedLine.match(MONTH_TIME_REGEX)?.[0] ??
    cleanedLine.match(NUMERIC_TIME_REGEX)?.[0] ??
    cleanedLine.match(TIME_ONLY_REGEX)?.[0] ??
    ''
  );
}

function extractAppointmentTime(lines: string[]): FieldResult {
  const candidates: Candidate[] = [];

  for (const line of lines) {
    if (!/\b(appointment|appt|visit|scheduled|delivery|meeting|arrival|time|date)\b/i.test(line)) {
      continue;
    }

    const fragment = extractDateTimeFragment(line);

    if (fragment) {
      maybeAddCandidate(candidates, fragment, 96, 'labeled appointment date/time');
    } else {
      maybeAddCandidate(candidates, cleanLabelPrefix(line), 60, 'labeled appointment text');
    }
  }

  if (candidates.length === 0) {
    for (const line of lines) {
      const fragment = extractDateTimeFragment(line);

      if (fragment) {
        maybeAddCandidate(candidates, fragment, 66, 'page date/time pattern');
      }
    }
  }

  for (const line of lines) {
    const contextMatch = line.match(
      /\b(?:scheduled|confirmed|visit)\b.*?\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?)\b/i,
    );

    if (contextMatch?.[1]) {
      maybeAddCandidate(candidates, contextMatch[1], 72, 'appointment sentence context');
    }
  }

  return pickBestCandidate(candidates);
}

function extractDealershipName(lines: string[], title: string): FieldResult {
  const candidates: Candidate[] = [];

  for (const line of lines) {
    const cleanedLine = cleanLabelPrefix(line);

    if (/\b(dealership|dealer|store|location)\b/i.test(line)) {
      if (DEALERSHIP_OF_REGEX.test(cleanedLine) || DEALERSHIP_SUFFIX_REGEX.test(cleanedLine)) {
        maybeAddCandidate(candidates, cleanedLine, 96, 'labeled dealership');
      } else if (cleanedLine.length <= 80) {
        maybeAddCandidate(candidates, cleanedLine, 76, 'labeled location text');
      }
    }

    const dealerMatch = cleanedLine.match(DEALERSHIP_OF_REGEX) ?? cleanedLine.match(DEALERSHIP_SUFFIX_REGEX);

    if (dealerMatch?.[0]) {
      maybeAddCandidate(candidates, dealerMatch[0], 74, 'page dealership pattern');
    }

    const contextMatch = line.match(/\bat\s+([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,4}\s+(?:Motors|Auto Group|Automotive))\b/);

    if (contextMatch?.[1]) {
      maybeAddCandidate(candidates, contextMatch[1], 78, 'dealership sentence context');
    }
  }

  const titleMatch = title.match(DEALERSHIP_OF_REGEX) ?? title.match(DEALERSHIP_SUFFIX_REGEX);

  if (titleMatch?.[0]) {
    maybeAddCandidate(candidates, titleMatch[0], 62, 'page title');
  }

  return pickBestCandidate(candidates);
}

function extractDealershipAddress(lines: string[], text: string): FieldResult {
  const candidates: Candidate[] = [];

  for (const line of lines) {
    const cleanedLine = cleanLabelPrefix(line);
    const match = cleanedLine.match(ADDRESS_REGEX);

    if (!match?.[0]) {
      continue;
    }

    if (/\b(address|dealership|dealer|store|location)\b/i.test(line)) {
      maybeAddCandidate(candidates, match[0], 95, 'labeled address');
    } else {
      maybeAddCandidate(candidates, match[0], 72, 'page address pattern');
    }
  }

  if (candidates.length === 0) {
    const textMatch = text.match(ADDRESS_REGEX);

    if (textMatch?.[0]) {
      maybeAddCandidate(candidates, textMatch[0], 58, 'page address pattern');
    }
  }

  return pickBestCandidate(candidates);
}

function withMeta(
  hints: AutofillHints,
  field: AutofillField,
  fieldResult: FieldResult,
) {
  if (!fieldResult.value) {
    return;
  }

  hints[field] = fieldResult.value;

  if (fieldResult.meta) {
    hints.meta = {
      ...hints.meta,
      [field]: fieldResult.meta,
    };
  }
}

export function extractAutofillHints(text: string, title = ''): AutofillHints {
  const limitedText = text.slice(0, 30000);
  const lines = toLines(limitedText);
  const hints: AutofillHints = {
    sourceTitle: title.trim(),
  };

  withMeta(hints, 'firstName', extractFirstName(lines, title));
  withMeta(hints, 'vehicle', extractVehicle(lines, limitedText));
  withMeta(hints, 'appointmentTime', extractAppointmentTime(lines));
  withMeta(hints, 'salespersonName', extractSalesperson(lines, title));
  withMeta(hints, 'dealershipName', extractDealershipName(lines, title));
  withMeta(hints, 'dealershipAddress', extractDealershipAddress(lines, limitedText));

  console.debug('[Repple][autofill]', {
    title,
    hints,
  });

  return hints;
}
