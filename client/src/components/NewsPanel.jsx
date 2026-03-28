import React, { useEffect, useRef, useState } from 'react';

const fmtL = v => {
  if (!v && v !== 0) return '—';
  if (v >= 100) return `₹${(v / 100).toFixed(1)}Cr`;
  return `₹${v}L`;
};

const NEWS_ICONS = {
  sold:    '🔨',
  unsold:  '❌',
  bid:     '💰',
  start:   '🏏',
  next:    '➡️',
  join:    '👤',
  system:  '📢',
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

export default function NewsPanel({ news }) {
  const bottomRef = useRef(null);
  const [highlight, setHighlight] = useState(null);

  // Auto scroll + highlight latest
  useEffect(() => {
    if (!news.length) return;
    const latest = news[news.length - 1];
    setHighlight(latest.id);
    setTimeout(() => setHighlight(null), 2000);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [news.length]);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>📰 Live News</span>
        <span style={s.count}>{news.length}</span>
      </div>

      {news.length === 0 && (
        <div style={s.empty}>
          <span style={{ fontSize: 32 }}>📡</span>
          <p>Auction news will appear here</p>
        </div>
      )}

      <div style={s.feed}>
        {news.map((item, i) => {
          const isLatest  = i === news.length - 1;
          const isHighlit = item.id === highlight;
          return (
            <div
              key={item.id}
              style={{
                ...s.item,
                ...(isLatest ? s.itemLatest : {}),
                ...(isHighlit ? s.itemFlash : {}),
                ...(item.type === 'sold'   ? s.itemSold   : {}),
                ...(item.type === 'unsold' ? s.itemUnsold : {}),
              }}
              className={isHighlit ? 'pop-in' : ''}
            >
              <div style={s.iconWrap}>
                <span style={s.icon}>{NEWS_ICONS[item.type] || '📢'}</span>
              </div>
              <div style={s.body}>
                <div style={s.headline}>{item.headline}</div>
                {item.detail && <div style={s.detail}>{item.detail}</div>}
                <div style={s.time}>{timeAgo(item.ts)}</div>
              </div>
              {item.type === 'sold' && (
                <div style={s.priceBadge}>{item.price}</div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const s = {
  wrap:       { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 },
  title:      { fontFamily: 'var(--font-d)', fontSize: 20, letterSpacing: '.03em' },
  count:      { fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 100 },
  empty:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, color: 'var(--text3)', fontSize: 13, textAlign: 'center' },
  feed:       { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4, minHeight: 0 },
  item:       { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', transition: 'all 300ms' },
  itemLatest: { border: '1px solid var(--border2)' },
  itemFlash:  { background: 'rgba(245,200,66,.08)', border: '1px solid rgba(245,200,66,.3)' },
  itemSold:   { borderLeft: '3px solid var(--gold)' },
  itemUnsold: { borderLeft: '3px solid var(--text3)' },
  iconWrap:   { width: 32, height: 32, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:       { fontSize: 16 },
  body:       { flex: 1, minWidth: 0 },
  headline:   { fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)' },
  detail:     { fontSize: 12, color: 'var(--text2)', marginTop: 3 },
  time:       { fontSize: 11, color: 'var(--text3)', marginTop: 4 },
  priceBadge: { flexShrink: 0, fontFamily: 'var(--font-d)', fontSize: 16, color: 'var(--gold)', letterSpacing: '.03em', alignSelf: 'center' },
};