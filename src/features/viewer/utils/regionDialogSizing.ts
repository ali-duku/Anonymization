function toPixels(value: string | null): number {
  if (!value || value === "normal") {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toSafeWidth(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.ceil(value);
}

function toSafeCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

export interface ElementInlineBounds {
  left: number;
  width: number;
}

export function measureElementInlineBounds(element: HTMLElement): ElementInlineBounds {
  const rect = element.getBoundingClientRect();
  return {
    left: toSafeCoordinate(rect.left + element.clientLeft),
    width: toSafeWidth(Math.floor(element.clientWidth))
  };
}

export function measurePaneHorizontalChrome(element: HTMLElement): number {
  const styles = window.getComputedStyle(element);
  return toSafeWidth(
    toPixels(styles.paddingLeft) +
      toPixels(styles.paddingRight) +
      toPixels(styles.borderLeftWidth) +
      toPixels(styles.borderRightWidth)
  );
}

export function measureProtectedContainerRequiredWidth(element: HTMLElement): number {
  const intrinsicWidth = measureIntrinsicInlineWidth(element);
  const liveWidth = measureLiveInlineWidth(element);
  const contentWidth = intrinsicWidth > 0 ? intrinsicWidth : liveWidth;

  if (contentWidth <= 0) {
    return 0;
  }

  return toSafeWidth(contentWidth + measureHorizontalMargins(element));
}

function measureLiveInlineWidth(element: HTMLElement): number {
  const rectWidth = Math.ceil(element.getBoundingClientRect().width);
  const scrollWidth = Math.ceil(element.scrollWidth);
  const clientWidth = Math.ceil(element.clientWidth);
  return toSafeWidth(Math.max(rectWidth, scrollWidth, clientWidth));
}

function measureIntrinsicInlineWidth(element: HTMLElement): number {
  if (!document.body) {
    return 0;
  }

  const computed = window.getComputedStyle(element);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = "-100000px";
  clone.style.top = "0";
  clone.style.display = computed.display;
  clone.style.width = "max-content";
  clone.style.maxWidth = "none";
  clone.style.minWidth = "0";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.contain = "layout style paint";

  document.body.appendChild(clone);
  const width = toSafeWidth(Math.ceil(clone.getBoundingClientRect().width));
  clone.remove();

  return width;
}

function measureHorizontalMargins(element: HTMLElement): number {
  const styles = window.getComputedStyle(element);
  return toSafeWidth(toPixels(styles.marginLeft) + toPixels(styles.marginRight));
}
