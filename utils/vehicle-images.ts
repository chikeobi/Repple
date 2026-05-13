import { browser } from 'wxt/browser';

import type { VehicleImageConfidence, VehicleImageSelection } from '../shared/repple-contract';
import type {
  PageExtractionPayload,
  PageImageCandidate,
  PageLinkCandidate,
} from './page-context';
import { debugLog } from './debug';
import { parseVehicleDescriptor } from '../shared/vehicle-images';
import { appendVinToVehicleImageResolveUrl, buildVehicleImageResolveUrl } from './repple';

const VEHICLE_IMAGE_DEBUG_PREFIX = '[Repple][vehicle-image]';
const VEHICLE_IMAGE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_INVENTORY_LINKS = 3;

type VehicleImageCandidate = PageImageCandidate;
type VehicleLinkCandidate = PageLinkCandidate;
type ScoredVehicleCandidate = {
  candidate: VehicleImageCandidate;
  score: number;
  confidence: VehicleImageConfidence;
};
type RankedVehicleImageSelection = {
  selection: VehicleImageSelection;
  score: number;
};

export type VehiclePageMediaContext = Pick<
  PageExtractionPayload,
  'pageUrl' | 'title' | 'visibleText' | 'vin' | 'images' | 'inventoryLinks'
>;

type CachedVehicleImageSelection = VehicleImageSelection & {
  cachedAt: number;
};

function getProviderPriority(provider: VehicleImageSelection['provider']) {
  if (provider === 'crm-page') {
    return 5;
  }

  if (provider === 'inventory-page') {
    return 4;
  }

  if (provider === 'vin-lookup') {
    return 3;
  }

  if (provider === 'external-api') {
    return 2;
  }

  return 1;
}

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

function inferConfidence(score: number): VehicleImageConfidence {
  if (score >= 105) {
    return 'high';
  }

  if (score >= 72) {
    return 'medium';
  }

  return 'low';
}

function buildVehicleImageCacheKey(vehicle: string, pageUrl: string, vin?: string | null) {
  const descriptor = parseVehicleDescriptor(vehicle);
  const normalizedVin = vin?.trim().toUpperCase() ?? '';

  if (normalizedVin) {
    return `vehicle-image:vin:${normalizedVin}`;
  }

  try {
    const origin = new URL(pageUrl).origin;
    return `vehicle-image:${origin}:${descriptor.cacheKey}`;
  } catch {
    return `vehicle-image:${descriptor.cacheKey}`;
  }
}

function getVehicleTokens(vehicle: string) {
  const descriptor = parseVehicleDescriptor(vehicle);
  const tokens = [
    descriptor.year,
    descriptor.make,
    descriptor.model,
    descriptor.trim,
    descriptor.bodyStyle,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9-]+/))
    .filter((token) => token.length >= 2);

  return {
    descriptor,
    tokens: Array.from(new Set(tokens)),
  };
}

function scoreCandidate(
  candidate: VehicleImageCandidate,
  vehicle: string,
  sourcePageUrl: string,
) {
  const { descriptor, tokens } = getVehicleTokens(vehicle);
  const haystack = [
    candidate.alt,
    candidate.title,
    candidate.className,
    candidate.nearbyText,
    candidate.url,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;

  if (!candidate.url || candidate.url.startsWith('data:')) {
    return { score: -1000, confidence: 'low' as const };
  }

  if (candidate.width < 180 || candidate.height < 120) {
    score -= 160;
  } else {
    score += Math.min(28, Math.round(Math.min(candidate.width, candidate.height) / 32));
  }

  const area = candidate.width * candidate.height;

  if (area >= 160_000) {
    score += 18;
  } else if (area >= 80_000) {
    score += 10;
  }

  if (/\b(svg|sprite|favicon)\b/.test(candidate.url)) {
    score -= 220;
  }

  if (
    /\b(no[-_ ]image|no[-_ ]photo|placeholder|stock[-_ ]photo|coming[-_ ]soon|default[-_ ]image)\b/.test(
      haystack,
    )
  ) {
    score -= 280;
  }

  if (
    /\b(logo|avatar|profile|icon|badge|brand|dealer\s?logo|placeholder|person|headshot)\b/.test(
      haystack,
    )
  ) {
    score -= 220;
  }

  if (candidate.source === 'meta' || candidate.source === 'json-ld') {
    score += 18;
  }

  if (candidate.source === 'gallery' || candidate.source === 'inventory-card') {
    score += 12;
  }

  if (/\b(hero|primary|featured|main|carousel|gallery|vehicle-photo)\b/.test(haystack)) {
    score += 18;
  }

  if (/\b(vehicle|vehicle details|inventory match|year make model|trim|body style|vin)\b/.test(haystack)) {
    score += 22;
  }

  if (/\b(customer|sales advisor|appointment owner|profile|contact)\b/.test(haystack)) {
    score -= 36;
  }

  if (descriptor.make && haystack.includes(descriptor.make.toLowerCase())) {
    score += 26;
  }

  if (descriptor.model && haystack.includes(descriptor.model.toLowerCase())) {
    score += 36;
  }

  if (descriptor.year && haystack.includes(descriptor.year.toLowerCase())) {
    score += 18;
  }

  if (descriptor.bodyStyle && haystack.includes(descriptor.bodyStyle)) {
    score += 10;
  }

  if (
    descriptor.bodyStyle === 'sedan' &&
    /\b(truck|pickup|suv|crossover|minivan|van)\b/.test(haystack)
  ) {
    score -= 42;
  }

  if (
    descriptor.bodyStyle === 'truck' &&
    /\b(sedan|coupe|hatchback|wagon|minivan)\b/.test(haystack)
  ) {
    score -= 42;
  }

  if (
    descriptor.bodyStyle === 'suv' &&
    /\b(sedan|truck|pickup|coupe|hatchback)\b/.test(haystack)
  ) {
    score -= 42;
  }

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 5;
    }
  }

  if (/\b(vehicle|inventory|stock|details|gallery|exterior|interior|lariat|sedan|truck|suv)\b/.test(haystack)) {
    score += 12;
  }

  const ratio = candidate.width > 0 && candidate.height > 0 ? candidate.width / candidate.height : 0;

  if (ratio >= 1.1 && ratio <= 2.3) {
    score += 10;
  }

  try {
    const pageOrigin = new URL(sourcePageUrl).origin;
    const candidateOrigin = new URL(candidate.url).origin;

    if (candidateOrigin === pageOrigin) {
      score += 8;
    }
  } catch {
    // ignore
  }

  return {
    score,
    confidence: inferConfidence(score),
  };
}

function pickBestCandidate(
  candidates: VehicleImageCandidate[],
  vehicle: string,
  sourcePageUrl: string,
): ScoredVehicleCandidate | null {
  const scored = candidates
    .map((candidate) => ({
      candidate,
      ...scoreCandidate(candidate, vehicle, sourcePageUrl),
    }))
    .filter((entry) => entry.score >= 48)
    .sort((left, right) => right.score - left.score);

  return scored[0] ?? null;
}

function scoreInventoryLink(link: VehicleLinkCandidate, vehicle: string, pageUrl: string) {
  const { descriptor, tokens } = getVehicleTokens(vehicle);
  const haystack = `${link.text} ${link.url}`.toLowerCase();
  let score = 0;

  if (descriptor.make && haystack.includes(descriptor.make.toLowerCase())) {
    score += 24;
  }

  if (descriptor.model && haystack.includes(descriptor.model.toLowerCase())) {
    score += 34;
  }

  if (descriptor.year && haystack.includes(descriptor.year)) {
    score += 16;
  }

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 4;
    }
  }

  if (/\b(vehicle|inventory|details|vdp|stock|new|used)\b/.test(haystack)) {
    score += 10;
  }

  try {
    if (new URL(link.url).origin === new URL(pageUrl).origin) {
      score += 10;
    }
  } catch {
    // ignore
  }

  return score;
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

function getInventoryImageUrl(image: Element, pageUrl: string) {
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
  ];

  for (const attributeName of directAttributeNames) {
    const url = normalizeUrl(image.getAttribute(attributeName) || '', pageUrl);

    if (url) {
      return url;
    }
  }

  return (
    parseSrcsetUrl(image.getAttribute('srcset'), pageUrl) ||
    parseSrcsetUrl(image.getAttribute('data-srcset'), pageUrl) ||
    parseSrcsetUrl(image.getAttribute('data-lazy-srcset'), pageUrl)
  );
}

function readJsonLdImage(doc: Document, baseUrl: string) {
  const candidates: VehicleImageCandidate[] = [];

  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    const text = script.textContent?.trim();

    if (!text) {
      continue;
    }

    try {
      const payload = JSON.parse(text);
      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        const images = Array.isArray(item?.image) ? item.image : item?.image ? [item.image] : [];

        for (const image of images) {
          if (typeof image !== 'string') {
            continue;
          }

          const url = normalizeUrl(image, baseUrl);

          if (!url) {
            continue;
          }

          candidates.push({
            url,
            width: 1200,
            height: 675,
            alt: '',
            title: '',
            className: '',
            nearbyText: '',
            source: 'json-ld',
          });
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return candidates;
}

function parseInventoryPageCandidates(html: string, pageUrl: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const candidates: VehicleImageCandidate[] = [];
  const ogImage = doc
    .querySelector('meta[property="og:image"], meta[name="twitter:image"]')
    ?.getAttribute('content');

  if (ogImage) {
    const normalized = normalizeUrl(ogImage, pageUrl);

    if (normalized) {
      candidates.push({
        url: normalized,
        width: 1200,
        height: 675,
        alt: '',
        title: '',
        className: '',
        nearbyText: doc.title,
        source: 'meta',
      });
    }
  }

  for (const image of Array.from(doc.querySelectorAll('img')).slice(0, 40)) {
    const url = getInventoryImageUrl(image, pageUrl);

    if (!url) {
      continue;
    }

    candidates.push({
      url,
      width: Number(image.getAttribute('width') || 0),
      height: Number(image.getAttribute('height') || 0),
      alt: normalizeWhitespace(image.getAttribute('alt') || ''),
      title: normalizeWhitespace(image.getAttribute('title') || ''),
      className: normalizeWhitespace(image.getAttribute('class') || ''),
      nearbyText: normalizeWhitespace(image.closest('section, article, div')?.textContent || '')
        .slice(0, 400),
      source: 'inventory-page',
    });
  }

  for (const element of Array.from(doc.querySelectorAll('[style*="background-image"]')).slice(0, 20)) {
    const url = parseInlineBackgroundImage(element.getAttribute('style'), pageUrl);

    if (!url) {
      continue;
    }

    candidates.push({
      url,
      width: 1200,
      height: 675,
      alt: '',
      title: '',
      className: normalizeWhitespace(element.getAttribute('class') || ''),
      nearbyText: normalizeWhitespace(element.textContent || '').slice(0, 320),
      source: 'inventory-page',
    });
  }

  return [...candidates, ...readJsonLdImage(doc, pageUrl)];
}

async function readVehicleImageCache(cacheKey: string) {
  const stored = await browser.storage.local.get(cacheKey);
  const cached = stored[cacheKey] as CachedVehicleImageSelection | undefined;

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > VEHICLE_IMAGE_CACHE_TTL_MS) {
    await browser.storage.local.remove(cacheKey);
    return null;
  }

  return cached;
}

async function saveVehicleImageCache(cacheKey: string, selection: VehicleImageSelection) {
  await browser.storage.local.set({
    [cacheKey]: {
      ...selection,
      cachedAt: Date.now(),
    } satisfies CachedVehicleImageSelection,
  });
}

async function saveVehicleImageCacheIfPreferred(
  cacheKey: string,
  selection: VehicleImageSelection,
) {
  const cached = await readVehicleImageCache(cacheKey);

  if (
    cached &&
    getProviderPriority(cached.provider) > getProviderPriority(selection.provider)
  ) {
    return;
  }

  await saveVehicleImageCache(cacheKey, selection);
}

async function fetchInventoryImageSelection(
  inventoryLinks: VehicleLinkCandidate[],
  vehicle: string,
  pageUrl: string,
): Promise<RankedVehicleImageSelection | null> {
  const bestLinks = [...inventoryLinks]
    .map((link) => ({
      link,
      score: scoreInventoryLink(link, vehicle, pageUrl),
    }))
    .filter((entry) => entry.score >= 26)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_INVENTORY_LINKS);

  for (const entry of bestLinks) {
    try {
      const response = await fetch(entry.link.url, {
        method: 'GET',
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const candidate = pickBestCandidate(
        parseInventoryPageCandidates(html, entry.link.url),
        vehicle,
        entry.link.url,
      );

      if (!candidate) {
        continue;
      }

      return {
        selection: {
          url: candidate.candidate.url,
          provider: 'inventory-page' as const,
          sourcePageUrl: entry.link.url,
          confidence: candidate.confidence,
        },
        score: candidate.score,
      };
    } catch (error) {
      debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
        action: 'inventory-fetch-failed',
        url: entry.link.url,
        error,
      });
    }
  }

  return null;
}

async function fetchExternalVehicleImageSelection(
  vehicle: string,
  vin?: string | null,
): Promise<VehicleImageSelection | null> {
  try {
    const response = await fetch(
      appendVinToVehicleImageResolveUrl(buildVehicleImageResolveUrl(vehicle), vin),
      {
        method: 'GET',
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      imageUrl?: string | null;
      provider?: string | null;
      sourcePageUrl?: string | null;
      usedFallback?: boolean;
    };

    if (!payload.imageUrl) {
      return null;
    }

    const provider: VehicleImageSelection['provider'] =
      payload.provider === 'crm-page' ||
      payload.provider === 'inventory-page' ||
      payload.provider === 'vin-lookup' ||
      payload.provider === 'external-api'
        ? payload.provider
        : 'fallback';

    return {
      url: payload.imageUrl,
      provider,
      sourcePageUrl: payload.sourcePageUrl ?? null,
      confidence:
        provider === 'crm-page' || provider === 'inventory-page' ? 'high' : 'medium',
    };
  } catch (error) {
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'external-vehicle-image-failed',
      error,
    });
    return null;
  }
}

async function persistResolvedVehicleImageSelection(
  vehicle: string,
  selection: VehicleImageSelection,
  vin?: string | null,
) {
  try {
    await fetch(buildVehicleImageResolveUrl(vehicle), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        vehicle,
        vin: vin?.trim() ?? null,
        imageUrl: selection.url,
        provider: selection.provider,
        sourcePageUrl: selection.sourcePageUrl,
      }),
    });
  } catch (error) {
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'persist-selection-failed',
      vehicle,
      selection,
      error,
    });
  }
}

function createCrmPageSelection(
  candidate: ScoredVehicleCandidate,
  sourcePageUrl: string,
): RankedVehicleImageSelection {
  return {
    selection: {
      url: candidate.candidate.url,
      provider: 'crm-page',
      sourcePageUrl,
      confidence: candidate.confidence,
    },
    score: candidate.score,
  };
}

function choosePreferredImageSelection(input: {
  directCandidate: ScoredVehicleCandidate | null;
  inventorySelection: RankedVehicleImageSelection | null;
  sourcePageUrl: string;
}) {
  const { directCandidate, inventorySelection, sourcePageUrl } = input;

  if (!directCandidate) {
    return inventorySelection;
  }

  const crmSelection = createCrmPageSelection(directCandidate, sourcePageUrl);

  if (!inventorySelection) {
    return crmSelection;
  }

  if (directCandidate.score >= 108) {
    return crmSelection;
  }

  if (
    directCandidate.confidence === 'high' &&
    directCandidate.score >= inventorySelection.score - 6
  ) {
    return crmSelection;
  }

  if (
    directCandidate.confidence === 'medium' &&
    inventorySelection.score <= directCandidate.score + 12
  ) {
    return crmSelection;
  }

  return inventorySelection;
}

export async function resolveVehicleImageSelection(
  context: VehiclePageMediaContext,
  vehicle: string,
): Promise<VehicleImageSelection | null> {
  const normalizedVehicle = normalizeWhitespace(vehicle);

  if (!normalizedVehicle) {
    return null;
  }

  const cacheKey = buildVehicleImageCacheKey(normalizedVehicle, context.pageUrl, context.vin);
  const cached = await readVehicleImageCache(cacheKey);

  const directCandidate = pickBestCandidate(context.images, normalizedVehicle, context.pageUrl);

  if (cached && getProviderPriority(cached.provider) >= getProviderPriority('inventory-page')) {
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'cache-hit',
      cacheKey,
      selection: cached,
    });

    return cached as VehicleImageSelection;
  }

  const inventorySelection =
    directCandidate?.score && directCandidate.score >= 108
      ? null
      : await fetchInventoryImageSelection(
          context.inventoryLinks,
          normalizedVehicle,
          context.pageUrl,
        );
  const preferredRealSelection = choosePreferredImageSelection({
    directCandidate,
    inventorySelection,
    sourcePageUrl: context.pageUrl,
  });

  if (preferredRealSelection) {
    await saveVehicleImageCacheIfPreferred(cacheKey, preferredRealSelection.selection);
    void persistResolvedVehicleImageSelection(
      normalizedVehicle,
      preferredRealSelection.selection,
      context.vin,
    );
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action:
        preferredRealSelection.selection.provider === 'crm-page'
          ? 'direct-page-match'
          : 'inventory-page-match',
      cacheKey,
      selection: preferredRealSelection.selection,
      score: preferredRealSelection.score,
    });
    return preferredRealSelection.selection;
  }

  if (cached && getProviderPriority(cached.provider) >= getProviderPriority('vin-lookup')) {
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'cache-hit',
      cacheKey,
      selection: cached,
    });

    return cached as VehicleImageSelection;
  }

  const externalSelection = await fetchExternalVehicleImageSelection(normalizedVehicle, context.vin);

  if (externalSelection) {
    await saveVehicleImageCacheIfPreferred(cacheKey, externalSelection);
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'external-match',
      cacheKey,
      selection: externalSelection,
    });
    return externalSelection;
  }

  if (cached) {
    debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'cache-hit',
      cacheKey,
      selection: cached,
    });

    return cached as VehicleImageSelection;
  }

  debugLog(VEHICLE_IMAGE_DEBUG_PREFIX, {
    action: 'fallback-only',
    cacheKey,
    vehicle: normalizedVehicle,
    vin: context.vin,
  });

  return null;
}
