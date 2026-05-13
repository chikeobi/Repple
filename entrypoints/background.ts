import { browser } from 'wxt/browser';

const SIDE_PANEL_PATH = 'sidepanel.html';

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

function enableWorkspaceSidePanel() {
  if (!browser.sidePanel || typeof browser.sidePanel.setOptions !== 'function') {
    return Promise.resolve();
  }

  return browser.sidePanel.setOptions({
    enabled: true,
    path: SIDE_PANEL_PATH,
  });
}

async function openWorkspaceForTab(tabId: number) {
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

  if (!hasSidePanelBehaviorApi()) {
    browser.action.onClicked.addListener((tab) => {
      if (!tab.id) {
        return;
      }

      void openWorkspaceForTab(tab.id).catch(() => {});
    });
  }
});
