import { browser } from 'wxt/browser';

const SIDE_PANEL_PATH = 'sidepanel.html';
const RECENT_OPEN_WINDOW_MS = 900;
let lastOpenRequest: { tabId: number; at: number } | null = null;

function hasSidePanelOpenApi() {
  return Boolean(
    browser.sidePanel &&
      typeof browser.sidePanel.open === 'function' &&
      typeof browser.sidePanel.setOptions === 'function',
  );
}

function hasSidePanelBehaviorApi() {
  return Boolean(
    browser.sidePanel && typeof browser.sidePanel.setPanelBehavior === 'function',
  );
}

function enableWorkspaceSidePanel(tabId?: number) {
  if (!browser.sidePanel || typeof browser.sidePanel.setOptions !== 'function') {
    return Promise.resolve();
  }

  return browser.sidePanel.setOptions({
    enabled: true,
    path: SIDE_PANEL_PATH,
    ...(typeof tabId === 'number' ? { tabId } : {}),
  });
}

async function openWorkspaceForTab(tabId: number) {
  const now = Date.now();

  if (
    lastOpenRequest &&
    lastOpenRequest.tabId === tabId &&
    now - lastOpenRequest.at < RECENT_OPEN_WINDOW_MS
  ) {
    return;
  }

  lastOpenRequest = {
    tabId,
    at: now,
  };

  await enableWorkspaceSidePanel(tabId);

  if (!hasSidePanelOpenApi()) {
    return;
  }

  await browser.sidePanel.open({ tabId });
}

async function configureSidePanelBehavior() {
  await enableWorkspaceSidePanel();

  if (!hasSidePanelBehaviorApi()) {
    return false;
  }

  await browser.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });

  return true;
}

export default defineBackground(() => {
  void configureSidePanelBehavior().catch(() => {});

  browser.runtime.onInstalled.addListener(() => {
    void configureSidePanelBehavior().catch(() => {});
  });

  browser.runtime.onStartup.addListener(() => {
    void configureSidePanelBehavior().catch(() => {});
  });

  browser.action.onClicked.addListener((tab) => {
    if (!tab.id) {
      return;
    }

    void openWorkspaceForTab(tab.id).catch(() => {});
  });
});
