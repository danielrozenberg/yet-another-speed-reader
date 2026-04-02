import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

export const _ = browser.i18n.getMessage.bind(browser.i18n);
export const url = browser.runtime.getURL.bind(browser.runtime);
