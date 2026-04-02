import { voidifyAsync } from './common/async';

import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'start-speed-reader',
    title: browser.i18n.getMessage('contextMenuStart'),
    contexts: ['page', 'selection'],
    command: '_execute_action',
  });
});

browser.runtime.onMessage.addListener(async (message_: unknown) => {
  if (!message_ || typeof message_ !== 'object' || !('action' in message_)) {
    console.error(
      'Received unparseable message from content script:',
      message_,
    );
    return;
  }

  const message = message_ as Message;
  switch (message.action) {
    case 'open-settings':
      await browser.runtime.openOptionsPage();
      break;

    default:
      console.warn('Received message with unknown action:', message.action);
  }
});

browser.action.onClicked.addListener(
  voidifyAsync(async (tab) => {
    const tabId = tab.id;
    if (!tabId) {
      console.warn('Action button clicked without a valid tab ID.');
      return;
    }
    await startSpeedReader(tabId);
  }),
);

async function startSpeedReader(tabId: number) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['content.mjs'],
    });
  } catch (error) {
    console.error('Failed to execute speed reader script:', error);
  }
}
