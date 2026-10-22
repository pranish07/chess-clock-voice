export function t(key: string, substitutions?: string | string[]): string {
  try {
    const message = chrome.i18n?.getMessage(key, substitutions);
    if (message) return message;
  } catch {
    // chrome.i18n is unavailable in unit tests and plain Vite previews.
  }
  return key;
}

export function categoryLabelKey(category: string): string {
  return `category${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}
