const segmenter = new Intl.Segmenter('ko', {granularity:'grapheme'});
export function normalizeText(text) { return text.normalize('NFC').replace(/\r\n|[\r\n\t]/g, ' '); }
export function countText(text) {
  const normalized = normalizeText(text);
  const count = value => Array.from(segmenter.segment(value)).length;
  return {withSpace:count(normalized), withoutSpace:count(normalized.replace(/\s/gu,''))};
}
export function pageText(items) { return items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : '')).join('').trim(); }
