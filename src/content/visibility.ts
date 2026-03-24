const NON_RENDERING_ELEMENT_TAG_NAMES = [
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
];

export function isTextNodeVisible(textNode: Node): boolean {
  if (textNode.nodeType !== Node.TEXT_NODE) {
    return false;
  }

  const { parentElement } = textNode;
  if (!parentElement) {
    return false;
  }

  if (NON_RENDERING_ELEMENT_TAG_NAMES.includes(parentElement.tagName)) {
    return false;
  }

  const style = window.getComputedStyle(parentElement);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false;
  }

  const rect = parentElement.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) {
    return false;
  }

  return true;
}
