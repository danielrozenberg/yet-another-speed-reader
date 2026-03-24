import type { Browser } from 'webextension-polyfill';

declare const browser: Browser;

export const _ = browser.i18n.getMessage;
export const url = browser.runtime.getURL;
