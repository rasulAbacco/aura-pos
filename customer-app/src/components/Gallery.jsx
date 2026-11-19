import { useState } from 'react';
import { imageUrl } from '../lib/media.js';
import { cx } from './ui.jsx';

/** Photo gallery: swipe on phones, thumbnails to switch on wider screens. */
export function Gallery({ images, alt, aspect = 'aspect-square', fallback }) {
  const [i, setI] = useState(0);
  if (!images?.length) return fallback ?? null;
  return (
    <div>
      <div className={cx('no-scrollbar snap-x-mandatory flex overflow-x-auto rounded-3xl bg-petal md:overflow-hidden', aspect)}
        onScroll={(e) => { const w = e.currentTarget.clientWidth; setI(Math.round(e.currentTarget.scrollLeft / w)); }}>
        {/* Phones: all photos side by side to swipe. Wide screens: the selected one. */}
        {images.map((m, k) => (
          <img key={m.id} src={imageUrl(m.id)} alt={`${alt} — photo ${k + 1}`} loading={k ? 'lazy' : 'eager'}
            className={cx('snap-center h-full w-full shrink-0 object-cover', k !== i && 'md:hidden')} />
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-2 md:justify-start" role="tablist" aria-label="Photos">
          {images.map((m, k) => (
            <button key={m.id} role="tab" aria-selected={k === i} aria-label={`Photo ${k + 1}`} onClick={() => setI(k)}
              className={cx('overflow-hidden rounded-xl ring-2 transition', k === i ? 'ring-mauve' : 'ring-transparent opacity-70 hover:opacity-100', 'h-2 w-2 rounded-full md:h-16 md:w-16 md:rounded-xl', k === i ? 'bg-mauve' : 'bg-blush')}>
              <img src={imageUrl(m.id)} alt="" className="hidden h-full w-full object-cover md:block" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
