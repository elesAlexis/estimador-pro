/** Interpreta el subconjunto Markdown del detalle sin ejecutar HTML remoto. */
export function markdownBlocks(source = '') {
  const lines = source.replace(/\r\n/g, '\n').split('\n'), blocks = [];
  let i = 0;
  const listItem = line => /^(\s*)(?:[-*+] |\d+\. )(.*)$/.exec(line);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      const code = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++; blocks.push({ type: 'code', text: code.join('\n') }); continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) { blocks.push({ type: 'heading', level: Math.min(heading[1].length + 1, 6), text: heading[2] }); i++; continue; }
    if (listItem(line)) {
      const items = [], ordered = /^\s*\d+\./.test(line);
      while (i < lines.length && listItem(lines[i])) {
        const match = listItem(lines[i++]);
        const check = /^\[([ xX])\]\s+(.*)$/.exec(match[2]);
        items.push({ text: check ? check[2] : match[2], checked: check ? check[1].toLowerCase() === 'x' : null, indent: Math.min(match[1].length, 12) });
      }
      blocks.push({ type: 'list', ordered, items }); continue;
    }
    if (/^>\s?/.test(line)) { blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') }); i++; continue; }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*```|>)/.test(lines[i]) && !listItem(lines[i])) paragraph.push(lines[i++]);
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
  }
  return blocks;
}

export function safeMarkdownLink(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl || undefined);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
