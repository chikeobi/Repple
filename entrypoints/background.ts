import { browser } from 'wxt/browser';

const SIDE_PANEL_PATH = 'sidepanel.html';

function disableGlobalSidePanel() {
  return browser.sidePanel.setOptions({
    enabled: false,
  });
}

async function openTabScopedSidePanel(tabId: number) {
  await browser.sidePanel.setOptions({
    tabId,
    path: SIDE_PANEL_PATH,
    enabled: true,
  });

  await browser.sidePanel.open({
    tabId,
  });
}

export default defineBackground(() => {
  disableGlobalSidePanel().catch(() => {});

  browser.runtime.onInstalled.addListener(() => {
    disableGlobalSidePanel().catch(() => {});
  });

  browser.runtime.onStartup.addListener(() => {
    disableGlobalSidePanel().catch(() => {});
  });

  browser.action.onClicked.addListener((tab) => {
    if (!tab.id) {
      return;
    }

    void openTabScopedSidePanel(tab.id).catch(() => {});
  });
});
