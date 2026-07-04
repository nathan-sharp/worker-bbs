export interface FormattedLine {
  type: 'greentext' | 'quote' | 'normal' | 'empty';
  text: string;
  quoteId?: number;
}

export function parseCommentLines(comment: string | null | undefined): FormattedLine[] {
  if (!comment) return [];
  const lines = comment.split(/\r?\n/);

  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return { type: 'empty', text: '' };
    }
    if (trimmed.startsWith('>')) {
      if (trimmed.startsWith('>>') && /^\>>\d+$/.test(trimmed.split(/\s+/)[0])) {
        const match = trimmed.match(/^\>>(\d+)/);
        if (match) {
          return {
            type: 'quote',
            text: line,
            quoteId: parseInt(match[1], 10),
          };
        }
      }
      return {
        type: 'greentext',
        text: line,
      };
    }
    return {
      type: 'normal',
      text: line,
    };
  });
}

export function sanitizeInput(str: string | null | undefined, maxLen: number = 2000): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}
