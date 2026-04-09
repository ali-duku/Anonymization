const RANGE_SELECTOR = "[data-range-start][data-range-end]";

interface CaretPoint {
  node: Node;
  offset: number;
}

function parseRangeBounds(element: HTMLElement): { start: number; end: number } | null {
  const startRaw = element.dataset.rangeStart;
  const endRaw = element.dataset.rangeEnd;
  const start = Number(startRaw);
  const end = Number(endRaw);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
    return null;
  }
  return { start, end };
}

function getRangeElement(node: Node | null, root: HTMLElement): HTMLElement | null {
  if (!node) {
    return null;
  }
  const element = (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>(
    RANGE_SELECTOR
  );
  if (!element || !root.contains(element)) {
    return null;
  }
  return element;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function readCaretPoint(clientX: number, clientY: number): CaretPoint | null {
  const targetDocument = window.document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (typeof targetDocument.caretPositionFromPoint === "function") {
    const position = targetDocument.caretPositionFromPoint(clientX, clientY);
    if (position && position.offsetNode) {
      return { node: position.offsetNode, offset: position.offset };
    }
  }

  if (typeof targetDocument.caretRangeFromPoint === "function") {
    const range = targetDocument.caretRangeFromPoint(clientX, clientY);
    if (range && range.startContainer) {
      return { node: range.startContainer, offset: range.startOffset };
    }
  }

  return null;
}

function resolveOffsetFromCaretPoint(
  root: HTMLElement,
  caretPoint: CaretPoint
): number | null {
  const rangeElement = getRangeElement(caretPoint.node, root);
  if (!rangeElement) {
    return null;
  }

  const bounds = parseRangeBounds(rangeElement);
  if (!bounds) {
    return null;
  }

  const range = document.createRange();
  try {
    range.setStart(rangeElement, 0);
    if (caretPoint.node.nodeType === Node.TEXT_NODE) {
      const textNode = caretPoint.node as Text;
      range.setEnd(textNode, clamp(caretPoint.offset, 0, textNode.length));
    } else {
      const endNode = caretPoint.node as Element;
      range.setEnd(endNode, clamp(caretPoint.offset, 0, endNode.childNodes.length));
    }
  } catch {
    return null;
  }

  const distance = clamp(range.toString().length, 0, bounds.end - bounds.start);
  return bounds.start + distance;
}

function resolveOffsetFromElementPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number
): number | null {
  const element = document.elementFromPoint(clientX, clientY);
  const rangeElement = getRangeElement(element, root);
  if (!rangeElement) {
    return null;
  }

  const bounds = parseRangeBounds(rangeElement);
  if (!bounds) {
    return null;
  }

  const rect = rangeElement.getBoundingClientRect();
  const midpoint = rect.left + rect.width / 2;
  return clientX <= midpoint ? bounds.start : bounds.end;
}

function resolveFallbackOffset(root: HTMLElement, textLength: number, clientX: number, clientY: number): number | null {
  const rect = root.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  if (clientY <= rect.top || clientX <= rect.left) {
    return 0;
  }

  if (clientY >= rect.bottom || clientX >= rect.right) {
    return textLength;
  }

  return null;
}

export function resolvePreviewOffsetFromPoint(
  root: HTMLElement | null,
  clientX: number,
  clientY: number,
  textLength: number
): number | null {
  if (!root) {
    return null;
  }

  const caretPoint = readCaretPoint(clientX, clientY);
  if (caretPoint) {
    const offsetFromCaret = resolveOffsetFromCaretPoint(root, caretPoint);
    if (offsetFromCaret !== null) {
      return offsetFromCaret;
    }
  }

  const offsetFromElement = resolveOffsetFromElementPoint(root, clientX, clientY);
  if (offsetFromElement !== null) {
    return offsetFromElement;
  }

  return resolveFallbackOffset(root, textLength, clientX, clientY);
}
