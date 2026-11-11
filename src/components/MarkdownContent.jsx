import React from 'react';
import { markdownBlocks, safeMarkdownLink } from '../utils/markdown';

function inline(text, baseUrl, depth = 0) {
  if (depth > 5) return text;
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*([^*]+)\*|~~([^~]+)~~)/g;
  const parts = []; let position = 0, match;
  while ((match = pattern.exec(text))) {
    parts.push(text.slice(position, match.index));
    const key = match.index;
    if (match[2]) parts.push(<strong key={key}>{inline(match[2], baseUrl, depth + 1)}</strong>);
    else if (match[3]) parts.push(<code key={key}>{match[3]}</code>);
    else if (match[4]) {
      const href = safeMarkdownLink(match[5], baseUrl);
      parts.push(href ? <a key={key} href={href} target="_blank" rel="noreferrer">{match[4]}</a> : match[4]);
    } else if (match[6]) parts.push(<em key={key}>{match[6]}</em>);
    else parts.push(<del key={key}>{match[7]}</del>);
    position = pattern.lastIndex;
  }
  parts.push(text.slice(position)); return parts;
}
export default function MarkdownContent({ text = '', baseUrl }) {
  return <div className="issue-markdown">{markdownBlocks(text).map((block, index) => {
    if (block.type === 'heading') return React.createElement('h' + block.level, { key: index }, inline(block.text, baseUrl));
    if (block.type === 'code') return <pre key={index}><code>{block.text}</code></pre>;
    if (block.type === 'quote') return <blockquote key={index}>{inline(block.text, baseUrl)}</blockquote>;
    if (block.type === 'list') {
      const List = block.ordered ? 'ol' : 'ul';
      return <List key={index}>{block.items.map((item, n) => <li key={n} className={item.checked !== null ? 'issue-check-item' : ''} style={{ marginLeft: item.indent * 5 }}>
        {item.checked !== null && <input type="checkbox" checked={item.checked} disabled aria-label={item.text} />}
        <span>{inline(item.text, baseUrl)}</span></li>)}</List>;
    }
    return <p key={index}>{inline(block.text, baseUrl)}</p>;
  })}</div>;
}
