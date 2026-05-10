import { browser } from 'wxt/browser';

import { extractAutofillHints } from '../utils/autofill';

const CRM_LABEL_KEYWORDS =
  /customer|client|guest|buyer|lead|prospect|vehicle|car|model|appointment|appt|scheduled|delivery|arrival|sales|advisor|consultant|dealer|dealership|store|location|address/i;
const REPPLE_DEBUG_PREFIX = '[Repple][extract]';

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

function getNodeText(node: Element | null | undefined) {
  if (!node || !isVisibleElement(node)) {
    return '';
  }

  return node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
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

function getFieldContext() {
  return Array.from(document.querySelectorAll('input, textarea, select'))
    .map((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        return '';
      }

      const value = 'value' in field ? field.value.trim() : '';
      const label = getFieldLabel(field);

      if (!value || !label) {
        return '';
      }

      return `${label}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');
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

function getLabelValueContext() {
  const pairs = new Set<string>();

  for (const label of Array.from(document.querySelectorAll('label'))) {
    if (!isVisibleElement(label)) {
      continue;
    }

    const labelText = getNodeText(label);

    if (!labelText || !CRM_LABEL_KEYWORDS.test(labelText)) {
      continue;
    }

    const value = getAssociatedFieldValue(label);

    if (value) {
      pairs.add(`${labelText}: ${value}`);
    }
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

    if (value) {
      pairs.add(`${labelText}: ${value}`);
    }
  }

  return Array.from(pairs).join('\n');
}

function getVisiblePageText() {
  const bodyText = document.body?.innerText?.trim() ?? '';
  const fieldText = getFieldContext();
  const labelValueText = getLabelValueContext();

  return [document.title, labelValueText, fieldText, bodyText].filter(Boolean).join('\n');
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.debug(REPPLE_DEBUG_PREFIX, {
      status: 'content-script-ready',
      url: window.location.href,
      title: document.title,
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type !== 'repple:extract-page-context') {
        return undefined;
      }

      const visibleText = getVisiblePageText();
      const hints = extractAutofillHints(visibleText, document.title);

      console.debug(REPPLE_DEBUG_PREFIX, {
        url: window.location.href,
        title: document.title,
        hints,
      });

      return hints;
    });
  },
});
