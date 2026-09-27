import { useEffect, useRef } from "react";

interface HiddenInputOptions {
  onInput: (value: string) => void;
  onEnter: () => void;
  onBlur?: () => void;
}

// A real input kept off screen so phones open their keyboard; 3D objects mirror what's typed.
export const useHiddenInput = ({ onInput, onEnter, onBlur }: HiddenInputOptions) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handlers = useRef({ onInput, onEnter, onBlur });
  useEffect(() => { handlers.current = { onInput, onEnter, onBlur }; });

  useEffect(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Checkout field');
    Object.assign(input.style, {
      position: 'fixed',
      left: '0',
      bottom: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      fontSize: '16px',
      pointerEvents: 'none',
    });
    input.addEventListener('input', () => handlers.current.onInput(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== 'Tab') return;
      e.preventDefault();
      handlers.current.onEnter();
    });
    input.addEventListener('blur', () => handlers.current.onBlur?.());
    document.body.appendChild(input);
    inputRef.current = input;
    return () => input.remove();
  }, []);

  return (value: string, { type = 'text', autocomplete = 'on' }: { type?: string, autocomplete?: string } = {}) => {
    const input = inputRef.current;
    if (!input) return;
    input.type = type;
    input.autocomplete = autocomplete as AutoFill;
    input.value = value;
    input.focus({ preventScroll: true });
  };
};
