export const DEFAULT_PDF_URL = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

export const FIT_MODES = {
  WIDTH: 'width',
  PAGE: 'page',
  CUSTOM: 'custom',
};

export const MIN_SCALE = 0.45;
export const MAX_SCALE = 3.5;
export const SCALE_STEP = 0.15;

export function clampScale(value) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

export function getFileNameFromSource(source) {
  if (!source) {
    return 'Untitled PDF';
  }

  try {
    const url = new URL(source);
    const segments = url.pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments.at(-1) || 'Remote PDF');
  } catch {
    const segments = String(source).split('/').filter(Boolean);
    return segments.at(-1) || 'Document.pdf';
  }
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function highlightText(value, query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return escapeHtml(value);
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi');
  return escapeHtml(value).replace(pattern, '<mark class="pdf-hit">$1</mark>');
}

export function countMatches(text, query) {
  const trimmedQuery = query.trim();

  if (!text || !trimmedQuery) {
    return 0;
  }

  const pattern = new RegExp(escapeRegExp(trimmedQuery), 'gi');
  return text.match(pattern)?.length ?? 0;
}

export function formatBytes(bytes) {
  if (!bytes) {
    return 'Unknown';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

export function formatPageSize(size) {
  if (!size?.width || !size?.height) {
    return 'Unknown';
  }

  return `${Math.round(size.width)} x ${Math.round(size.height)} px`;
}

export function formatFitMode(fitMode) {
  if (fitMode === FIT_MODES.WIDTH) {
    return 'Fit width';
  }

  if (fitMode === FIT_MODES.PAGE) {
    return 'Fit page';
  }

  return 'Custom zoom';
}

export function getSourceLabel(sourceType) {
  return sourceType === 'file' ? 'Local file' : 'URL';
}

async function resolveDestinationPageNumber(pdfDocument, destination) {
  if (!destination) {
    return null;
  }

  let resolvedDestination = destination;

  if (typeof resolvedDestination === 'string') {
    resolvedDestination = await pdfDocument.getDestination(resolvedDestination);
  }

  if (!Array.isArray(resolvedDestination) || !resolvedDestination[0]) {
    return null;
  }

  const pageReference = resolvedDestination[0];

  if (typeof pageReference === 'number') {
    return pageReference + 1;
  }

  try {
    const pageIndex = await pdfDocument.getPageIndex(pageReference);
    return pageIndex + 1;
  } catch {
    return null;
  }
}

export async function buildOutlineTree(pdfDocument, outlineItems, path = 'outline') {
  if (!outlineItems?.length) {
    return [];
  }

  return Promise.all(
    outlineItems.map(async (item, index) => {
      const itemId = `${path}-${index}`;

      return {
        id: itemId,
        title: item.title?.trim() || `Section ${index + 1}`,
        pageNumber: await resolveDestinationPageNumber(pdfDocument, item.dest),
        url: item.url || null,
        items: await buildOutlineTree(pdfDocument, item.items ?? [], itemId),
      };
    }),
  );
}

export function countOutlineItems(outlineItems) {
  return outlineItems.reduce((count, item) => count + 1 + countOutlineItems(item.items ?? []), 0);
}
