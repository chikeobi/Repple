import { browser } from 'wxt/browser';

import { extractAutofillHints } from '../utils/autofill';

function getFieldContext() {
  return Array.from(document.querySelectorAll('input, textarea, select'))
    .map((field) => {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        return '';
      }

      const value = 'value' in field ? field.value.trim() : '';
      const label =
        field.getAttribute('aria-label')?.trim() ||
        field.getAttribute('placeholder')?.trim() ||
        field.getAttribute('name')?.trim() ||
        field.id.trim();

      if (!value || !label) {
        return '';
      }

      return `${label}: ${value}`;
    })
    .filter(Boolean)
    .join('\n');
}

function getVisiblePageText() {
  const bodyText = document.body?.innerText?.trim() ?? '';
  const fieldText = getFieldContext();

  return [document.title, bodyText, fieldText].filter(Boolean).join('\n');
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((message) => {
      if (message?.type !== 'repple:extract-page-context') {
        return undefined;
      }

      return extractAutofillHints(getVisiblePageText(), document.title);
    });
  },
});
