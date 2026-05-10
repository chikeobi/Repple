import { browser } from 'wxt/browser';

import type { VehicleImageConfidence, VehicleImageSelection } from '../shared/repple-contract';
import { parseVehicleDescriptor } from '../shared/vehicle-images';
import { appendVinToVehicleImageResolveUrl, buildVehicleImageResolveUrl } from './repple';

const VEHICLE_IMAGE_DEBUG_PREFIX = '[Repple][vehicle-image]';
const VEHICLE_IMAGE_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_INVENTORY_LINKS = 3;

type VehicleImageCandidate = {
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

type VehicleLinkCandidate = {
  url: string;
  text: string;
};

export type VehiclePageMediaContext = {
  pageUrl: string;
  pageTitle: string;
  visibleText: string;
  vin: string | null;
  images: VehicleImageCandidate[];
  inventoryLinks: VehicleLinkCandidate[];
};

type CachedVehicleImageSelection = VehicleImageSelection & {
  cachedAt: number;
};

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

function extractVin(value: string) {
  const match = value.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  return match?.[0] ?? null;
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

  if (/\b(svg|sprite|favicon)\b/.test(candidate.url)) {
    score -= 220;
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
) {
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
    const src =
      image.getAttribute('src') ||
      image.getAttribute('data-src') ||
      image.getAttribute('data-lazy-src') ||
      '';
    const url = normalizeUrl(src, pageUrl);

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

async function fetchInventoryImageSelection(
  inventoryLinks: VehicleLinkCandidate[],
  vehicle: string,
  pageUrl: string,
) {
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
        url: candidate.candidate.url,
        provider: 'inventory-page' as const,
        sourcePageUrl: entry.link.url,
        confidence: candidate.confidence,
      };
    } catch (error) {
      console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
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
    console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
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
    console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'persist-selection-failed',
      vehicle,
      selection,
      error,
    });
  }
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

  if (cached) {
    console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'cache-hit',
      cacheKey,
      selection: cached,
    });

    return cached as VehicleImageSelection;
  }

  const directCandidate = pickBestCandidate(context.images, normalizedVehicle, context.pageUrl);

  if (directCandidate) {
    const selection: VehicleImageSelection = {
      url: directCandidate.candidate.url,
      provider: 'crm-page',
      sourcePageUrl: context.pageUrl,
      confidence: directCandidate.confidence,
    };

    await saveVehicleImageCache(cacheKey, selection);
    void persistResolvedVehicleImageSelection(normalizedVehicle, selection, context.vin);
    console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'direct-page-match',
      cacheKey,
      selection,
      score: directCandidate.score,
    });
    return selection;
  }

  const inventorySelection = await fetchInventoryImageSelection(
    context.inventoryLinks,
    normalizedVehicle,
    context.pageUrl,
  );

  if (inventorySelection) {
    await saveVehicleImageCache(cacheKey, inventorySelection);
    void persistResolvedVehicleImageSelection(normalizedVehicle, inventorySelection, context.vin);
    console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'inventory-page-match',
      cacheKey,
      selection: inventorySelection,
    });
    return inventorySelection;
  }

  const externalSelection = await fetchExternalVehicleImageSelection(normalizedVehicle, context.vin);

  if (externalSelection) {
    await saveVehicleImageCache(cacheKey, externalSelection);
    console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
      action: 'external-match',
      cacheKey,
      selection: externalSelection,
    });
    return externalSelection;
  }

  console.debug(VEHICLE_IMAGE_DEBUG_PREFIX, {
    action: 'fallback-only',
    cacheKey,
    vehicle: normalizedVehicle,
    vin: context.vin,
  });

  return null;
}

export function extractVehiclePageMediaContextFromDocument(): VehiclePageMediaContext {
  const pageUrl = window.location.href;
  const pageTitle = document.title;
  const visibleText = document.body?.innerText?.trim() ?? '';
  const vin = extractVin(visibleText);
  const images: VehicleImageCandidate[] = [];
  const inventoryLinks: VehicleLinkCandidate[] = [];
  const seenImageUrls = new Set<string>();
  const seenLinks = new Set<string>();

  function isVisibleElement(element: Element) {
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

  function readNearbyText(element: Element) {
    return normalizeWhitespace(
      element.closest('article, section, [role="row"], li, .card, .vehicle, .inventory, .gallery, div')
        ?.textContent || '',
    ).slice(0, 320);
  }

  function pushImage(candidate: VehicleImageCandidate) {
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
      nearbyText: pageTitle,
      source: 'meta',
    });
  }

  for (const image of Array.from(document.querySelectorAll('img')).slice(0, 80)) {
    if (!isVisibleElement(image)) {
      continue;
    }

    const rect = image.getBoundingClientRect();
    const src =
      image.currentSrc ||
      image.getAttribute('src') ||
      image.getAttribute('data-src') ||
      image.getAttribute('data-lazy-src') ||
      '';

    pushImage({
      url: normalizeUrl(src, pageUrl),
      width: Math.round(rect.width || image.naturalWidth || 0),
      height: Math.round(rect.height || image.naturalHeight || 0),
      alt: normalizeWhitespace(image.getAttribute('alt') || ''),
      title: normalizeWhitespace(image.getAttribute('title') || ''),
      className: normalizeWhitespace(image.getAttribute('class') || ''),
      nearbyText: readNearbyText(image),
      source: image.closest('[class*="gallery"], [class*="inventory"], [class*="vehicle"]')
        ? 'gallery'
        : 'img',
    });
  }

  for (const element of Array.from(document.querySelectorAll<HTMLElement>('[style*="background-image"]')).slice(0, 40)) {
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
      nearbyText: readNearbyText(element),
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

    if (
      !href ||
      seenLinks.has(href) ||
      !/\b(vehicle|inventory|details|vdp|stock|new|used|ford|honda|toyota|chevrolet|gmc|ram|accord|civic|f-?150|pilot|camry|silverado)\b/.test(
        haystack,
      )
    ) {
      continue;
    }

    seenLinks.add(href);
    inventoryLinks.push({
      url: href,
      text,
    });
  }

  return {
    pageUrl,
    pageTitle,
    visibleText,
    vin,
    images,
    inventoryLinks,
  };
}
