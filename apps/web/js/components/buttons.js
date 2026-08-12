import { button } from '../html.js';

export function Button({ label, variant = 'primary', size = 'md', block = false, disabled = false, type = 'button', onClick = null, parent = null }) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`];
  if (block) classes.push('btn--block');

  return button(
    { className: classes, disabled, type, onClick: disabled ? null : onClick },
    parent,
    label
  );
}

export function IconButton({ icon, ariaLabel, onClick = null, parent = null }) {
  return button(
    { className: ['btn', 'btn--icon'], 'aria-label': ariaLabel, onClick, type: 'button' },
    parent,
    icon
  );
}
