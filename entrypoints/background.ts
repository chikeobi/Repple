import { browser } from 'wxt/browser';

const SIDE_PANEL_PATH = 'sidepanel.html';
const FALLBACK_PAGE_PATH = '/sidepanel.html';
let activePanelTabId: number | null = null;

function hasSidePanelApi() {
  return Boolean(
    browser.sidePanel &&
      typeof browser.sidePanel.setOptions === 'function' &&
      typeof browser.sidePanel.open === 'function',
  );
}

function disableGlobalSidePanel() {
  if (!browser.sidePanel || typeof browser.sidePanel.setOptions !== 'function') {
    return Promise.resolve();
  }

  return browser.sidePanel.setOptions({
    enabled: false,
  });
}

async function disableSidePanelForTab(tabId: number) {
  if (!browser.sidePanel || typeof browser.sidePanel.setOptions !== 'function') {
    return Promise.resolve();
  }

  return browser.sidePanel.setOptions({
    tabId,
    enabled: false,
  });
}

async function openFallbackWorkspacePage() {
  await browser.tabs.create({
    url: browser.runtime.getURL(FALLBACK_PAGE_PATH),
  });
}

async function resetAllTabPanels() {
  if (!hasSidePanelApi()) {
    activePanelTabId = null;
    return;
  }

  const tabs = await browser.tabs.query({});

  await Promise.all(
    tabs
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === 'number')
      .map((tabId) => disableSidePanelForTab(tabId).catch(() => {})),
  );

  activePanelTabId = null;
}

async function openTabScopedSidePanel(tabId: number) {
  if (!hasSidePanelApi()) {
    return false;
  }

  if (activePanelTabId && activePanelTabId !== tabId) {
    void disableSidePanelForTab(activePanelTabId).catch(() => {});
  }

  const setOptionsPromise = browser.sidePanel.setOptions({
    tabId,
    path: SIDE_PANEL_PATH,
    enabled: true,
  });

  try {
    await browser.sidePanel.open({ tabId });
    await setOptionsPromise.catch(() => {});
  } catch {
    await setOptionsPromise;
    await browser.sidePanel.open({ tabId });
  }

  activePanelTabId = tabId;

  return true;
}

async function openWorkspaceForTab(tabId: number) {
  if (!hasSidePanelApi()) {
    await openFallbackWorkspacePage();
    return;
  }

  try {
    await openTabScopedSidePanel(tabId);
  } catch {
    await openFallbackWorkspacePage();
  }
}

export default defineBackground(() => {
  disableGlobalSidePanel().catch(() => {});
  resetAllTabPanels().catch(() => {});

  browser.runtime.onInstalled.addListener(() => {
    disableGlobalSidePanel().catch(() => {});
    resetAllTabPanels().catch(() => {});
  });

  browser.runtime.onStartup.addListener(() => {
    disableGlobalSidePanel().catch(() => {});
    resetAllTabPanels().catch(() => {});
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    if (activePanelTabId === tabId) {
      activePanelTabId = null;
    }
  });

  browser.action.onClicked.addListener((tab) => {
    if (!tab.id) {
      return;
    }

    void openWorkspaceForTab(tab.id).catch(() => {});
  });
});
