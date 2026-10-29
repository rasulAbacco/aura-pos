/** Join class names, skipping falsy values: cx('a', cond && 'b'). */
export const cx = (...c) => c.filter(Boolean).join(' ');
