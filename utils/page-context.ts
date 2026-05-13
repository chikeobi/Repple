export type PageFieldSource = 'form' | 'label' | 'table' | 'text';

export type PageFieldEntry = {
  label: string;
  value: string;
  source: PageFieldSource;
  context: string;
};

export type PageImageCandidate = {
  url: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  className: string;
  nearbyText: string;
  source:
    | 'img'
    | 'background'
    | 'gallery'
    | 'inventory-card'
    | 'meta'
    | 'json-ld'
    | 'inventory-page';
};

export type PageLinkCandidate = {
  url: string;
  text: string;
};

export type PageExtractionPayload = {
  title: string;
  pageUrl: string;
  visibleText: string;
  fieldEntries: PageFieldEntry[];
  vin: string | null;
  images: PageImageCandidate[];
  inventoryLinks: PageLinkCandidate[];
};

const CRM_LABEL_KEYWORDS =
  /customer|client|guest|buyer|lead|prospect|name|phone|vehicle|car|model|stock|vin|trim|body|appointment|appt|scheduled|delivery|arrival|sales|advisor|consultant|dealer|dealership|store|location|address/i;
const INVENTORY_LINK_KEYWORDS =
  /\b(vehicle|inventory|details|vdp|stock|new|used|ford|honda|toyota|chevrolet|gmc|ram|accord|civic|f-?150|pilot|camry|silverado)\b/;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeUrl(url: string, baseUrl: string) {
  if (!url) {
    return '';
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return '';
  }
}

function parseInlineBackgroundImage(styleValue: string | null | undefined, baseUrl: string) {
  const match = styleValue?.match(/url\((['"]?)(.*?)\1\)/i);

  if (!match?.[2]) {
    return '';
  }

  return normalizeUrl(match[2], baseUrl);
}

function parseSrcsetUrl(srcsetValue: string | null | undefined, baseUrl: string) {
  const candidates = (srcsetValue ?? '')
    .split(',')
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean)
    .map((entry) => {
      const [rawUrl, rawDescriptor] = entry.split(/\s+/, 2);
      const descriptor = rawDescriptor?.trim() ?? '';
      const widthMatch = descriptor.match(/^(\d+)w$/i);
      const densityMatch = descriptor.match(/^(\d+(?:\.\d+)?)x$/i);

      return {
        url: normalizeUrl(rawUrl ?? '', baseUrl),
        score: widthMatch
          ? Number(widthMatch[1])
          : densityMatch
            ? Number(densityMatch[1]) * 1000
            : 0,
      };
    })
    .filter((entry) => Boolean(entry.url));

  if (candidates.length === 0) {
    return '';
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.url ?? '';
}

function getElementImageUrl(element: Element, baseUrl: string) {
  const directAttributeNames = [
    'src',
    'data-src',
    'data-lazy-src',
    'data-original',
    'data-image',
    'data-zoom-image',
    'data-large-image',
    'data-full-image',
    'data-fullres',
    'data-background-image',
  ];

  if (element instanceof HTMLImageElement) {
    const currentSource = normalizeUrl(element.currentSrc, baseUrl);

    if (currentSource) {
      return currentSource;
    }
  }

  for (const attributeName of directAttributeNames) {
    const url = normalizeUrl(element.getAttribute(attributeName) || '', baseUrl);

    if (url) {
      return url;
    }
  }

  const srcsetUrl =
    parseSrcsetUrl(element.getAttribute('srcset'), baseUrl) ||
    parseSrcsetUrl(element.getAttribute('data-srcset'), baseUrl) ||
    parseSrcsetUrl(element.getAttribute('data-lazy-srcset'), baseUrl);

  if (srcsetUrl) {
    return srcsetUrl;
  }

  return '';
}

function extractVin(value: string) {
  const match = value.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  return match?.[0] ?? null;
}

function buildTextPairs(text: string) {
  const entries: PageFieldEntry[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split('\n')) {
    const line = normalizeWhitespace(rawLine);

    if (!line || line.length > 220) {
      continue;
    }

    const match = line.match(
      /^([A-Za-z][A-Za-z0-9 &'/.()-]{1,60}?)(?:\s*:\s*|\s+-\s+)(.+)$/,
    );

    if (!match?.[1] || !match[2]) {
      continue;
    }

    const label = normalizeWhitespace(match[1]);
    const value = normalizeWhitespace(match[2]);

    if (!CRM_LABEL_KEYWORDS.test(label) || !value) {
      continue;
    }

    const key = `${label.toLowerCase()}::${value.toLowerCase()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    entries.push({
      label,
      value,
      source: 'text',
      context: line,
    });
  }

  return entries;
}

export function extractPageContextFromDocument(): PageExtractionPayload {
  const pageUrl = window.location.href;
  const title = document.title;
  const bodyText = document.body?.innerText?.trim() ?? '';
  const fieldEntries: PageFieldEntry[] = [];
  const images: PageImageCandidate[] = [];
  const inventoryLinks: PageLinkCandidate[] = [];
  const seenEntries = new Set<string>();
  const seenImageUrls = new Set<string>();
  const seenLinks = new Set<string>();

  function isVisibleElement(element: Element | null | undefined) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function getNodeText(node: Element | null | undefined) {
    if (!node || !isVisibleElement(node)) {
      return '';
    }

    return normalizeWhitespace(node.textContent ?? '');
  }

  function getContextText(element: Element | null | undefined) {
    return normalizeWhitespace(
      element?.closest('article, section, [role="row"], tr, li, .card, .vehicle, .inventory, .gallery, div')
        ?.textContent ?? '',
    ).slice(0, 320);
  }

  function pushFieldEntry(entry: PageFieldEntry) {
    const label = normalizeWhitespace(entry.label);
    const value = normalizeWhitespace(entry.value);

    if (!label || !value || !CRM_LABEL_KEYWORDS.test(label)) {
      return;
    }

    const key = `${label.toLowerCase()}::${value.toLowerCase()}`;

    if (seenEntries.has(key)) {
      return;
    }

    seenEntries.add(key);
    fieldEntries.push({
      label,
      value,
      source: entry.source,
      context: normalizeWhitespace(entry.context || `${label}: ${value}`),
    });
  }

  function getFieldLabel(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
    const associatedLabel =
      (field.id ? document.querySelector(`label[for="${field.id}"]`) : null) ??
      field.closest('label');
    const associatedLabelText = getNodeText(associatedLabel);

    if (associatedLabelText) {
      return associatedLabelText.replace(/\s*:\s*$/, '').trim();
    }

    const previousElementText = getNodeText(field.previousElementSibling);

    if (previousElementText && CRM_LABEL_KEYWORDS.test(previousElementText)) {
      return previousElementText.replace(/\s*:\s*$/, '').trim();
    }

    return (
      field.getAttribute('aria-label')?.trim() ||
      field.getAttribute('placeholder')?.trim() ||
      field.getAttribute('name')?.trim() ||
      field.id.trim()
    );
  }

  function getAssociatedFieldValue(label: HTMLLabelElement) {
    const labelledField =
      (label.htmlFor ? document.getElementById(label.htmlFor) : null) ??
      label.querySelector('input, textarea, select');

    if (
      labelledField instanceof HTMLInputElement ||
      labelledField instanceof HTMLTextAreaElement ||
      labelledField instanceof HTMLSelectElement
    ) {
      return labelledField.value.trim();
    }

    return '';
  }

  function getSiblingValue(labelElement: Element) {
    const siblingCandidates = [
      labelElement.nextElementSibling,
      labelElement.parentElement?.nextElementSibling,
      labelElement.parentElement?.querySelector(':scope > :last-child'),
    ];

    for (const candidate of siblingCandidates) {
      const text = getNodeText(candidate);

      if (text && text !== getNodeText(labelElement)) {
        return text;
      }
    }

    const row = labelElement.closest('tr');

    if (row) {
      const cells = Array.from(row.children).filter((cell) => cell !== labelElement);

      for (const cell of cells) {
        const text = getNodeText(cell);

        if (text) {
          return text;
        }
      }
    }

    return '';
  }

  function pushImage(candidate: PageImageCandidate) {
    if (!candidate.url || seenImageUrls.has(candidate.url)) {
      return;
    }

    seenImageUrls.add(candidate.url);
    images.push(candidate);
  }

  const metaImage = document
    .querySelector('meta[property="og:image"], meta[name="twitter:image"]')
    ?.getAttribute('content');

  if (metaImage) {
    pushImage({
      url: normalizeUrl(metaImage, pageUrl),
      width: 1200,
      height: 675,
      alt: '',
      title: '',
      className: '',
      nearbyText: title,
      source: 'meta',
    });
  }

  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    const text = script.textContent?.trim();

    if (!text) {
      continue;
    }

    try {
      const payload = JSON.parse(text);
      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        const jsonImages = Array.isArray(item?.image)
          ? item.image
          : item?.image
            ? [item.image]
            : [];

        for (const image of jsonImages) {
          if (typeof image !== 'string') {
            continue;
          }

          const url = normalizeUrl(image, pageUrl);

          if (!url) {
            continue;
          }

          pushImage({
            url,
            width: 1200,
            height: 675,
            alt: '',
            title: '',
            className: '',
            nearbyText: title,
            source: 'json-ld',
          });
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  for (const field of Array.from(document.querySelectorAll('input, textarea, select'))) {
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) ||
      !isVisibleElement(field)
    ) {
      continue;
    }

    const value = 'value' in field ? field.value.trim() : '';
    const label = getFieldLabel(field);

    if (!value || !label) {
      continue;
    }

    pushFieldEntry({
      label,
      value,
      source: 'form',
      context: getContextText(field) || `${label}: ${value}`,
    });
  }

  for (const label of Array.from(document.querySelectorAll('label'))) {
    if (!isVisibleElement(label)) {
      continue;
    }

    const labelText = getNodeText(label);

    if (!labelText || !CRM_LABEL_KEYWORDS.test(labelText)) {
      continue;
    }

    const value = getAssociatedFieldValue(label);

    if (!value) {
      continue;
    }

    pushFieldEntry({
      label: labelText,
      value,
      source: 'label',
      context: getContextText(label) || `${labelText}: ${value}`,
    });
  }

  const nearbyLabels = Array.from(
    document.querySelectorAll(
      'dt, th, [data-label], [class*="label"], [class*="Label"], [class*="field-name"]',
    ),
  ).slice(0, 400);

  for (const labelElement of nearbyLabels) {
    if (!isVisibleElement(labelElement)) {
      continue;
    }

    const labelText = getNodeText(labelElement);

    if (!labelText || !CRM_LABEL_KEYWORDS.test(labelText)) {
      continue;
    }

    const value = getSiblingValue(labelElement);

    if (!value) {
      continue;
    }

    pushFieldEntry({
      label: labelText,
      value,
      source: labelElement.closest('tr') ? 'table' : 'label',
      context: getContextText(labelElement) || `${labelText}: ${value}`,
    });
  }

  for (const entry of buildTextPairs(bodyText)) {
    pushFieldEntry(entry);
  }

  for (const image of Array.from(document.querySelectorAll('img')).slice(0, 80)) {
    if (!isVisibleElement(image)) {
      continue;
    }

    const rect = image.getBoundingClientRect();
    pushImage({
      url: getElementImageUrl(image, pageUrl),
      width: Math.round(rect.width || image.naturalWidth || 0),
      height: Math.round(rect.height || image.naturalHeight || 0),
      alt: normalizeWhitespace(image.getAttribute('alt') || ''),
      title: normalizeWhitespace(image.getAttribute('title') || ''),
      className: normalizeWhitespace(image.getAttribute('class') || ''),
      nearbyText: getContextText(image),
      source: image.closest('[class*="gallery"], [class*="inventory"], [class*="vehicle"]')
        ? 'gallery'
        : 'img',
    });
  }

  for (const element of Array.from(
    document.querySelectorAll<HTMLElement>('[style*="background-image"]'),
  ).slice(0, 40)) {
    if (!isVisibleElement(element)) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    const backgroundUrl = parseInlineBackgroundImage(element.style.backgroundImage, pageUrl);

    pushImage({
      url: backgroundUrl,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      alt: '',
      title: normalizeWhitespace(element.getAttribute('title') || ''),
      className: normalizeWhitespace(element.getAttribute('class') || ''),
      nearbyText: getContextText(element),
      source: 'background',
    });
  }

  for (const anchor of Array.from(document.querySelectorAll('a[href]')).slice(0, 120)) {
    if (!isVisibleElement(anchor)) {
      continue;
    }

    const href = normalizeUrl(anchor.getAttribute('href') || '', pageUrl);
    const text = normalizeWhitespace(anchor.textContent || '').slice(0, 180);
    const haystack = `${text} ${href}`.toLowerCase();

    if (!href || seenLinks.has(href) || !INVENTORY_LINK_KEYWORDS.test(haystack)) {
      continue;
    }

    seenLinks.add(href);
    inventoryLinks.push({
      url: href,
      text,
    });
  }

  const entryText = fieldEntries.map((entry) => `${entry.label}: ${entry.value}`).join('\n');
  const visibleText = [title, entryText, bodyText].filter(Boolean).join('\n');

  return {
    title,
    pageUrl,
    visibleText,
    fieldEntries,
    vin: extractVin(visibleText),
    images,
    inventoryLinks,
  };
}
