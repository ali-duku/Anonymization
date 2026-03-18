export function hasVisibleContent(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code !== 32 && code !== 9 && code !== 10 && code !== 13 && code !== 12 && code !== 11) {
      return true;
    }
  }
  return false;
}

export function countLines(value: string): number {
  if (!value) {
    return 0;
  }

  let lines = 1;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) {
      lines += 1;
    }
  }
  return lines;
}

export function getJsonErrorMessage(message?: string, line?: number, column?: number): string {
  const location = line ? `Line ${line}, column ${column ?? "?"}. ` : "";
  return `${location}${message ?? "Invalid JSON input."}`;
}
