import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  id: string;
  value: string;
  invalid: boolean;
  describedBy?: string;
  onChange: (dataUrl: string) => void;
}

const EXPORT_W = 600;
const EXPORT_H = 180;
const INK = '#0a1628';

/** Draw-or-type signature. Emits a small PNG data URL on a white background. */
export default function SignaturePad({ id, value, invalid, describedBy, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');

  const ctx = () => canvasRef.current!.getContext('2d')!;

  const paintBackground = () => {
    const c = ctx();
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, EXPORT_W, EXPORT_H);
  };

  useEffect(() => {
    paintBackground();
    if (value) {
      const image = new Image();
      image.onload = () => ctx().drawImage(image, 0, 0, EXPORT_W, EXPORT_H);
      image.src = value;
    }
    // Restores an existing signature once when the pad mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * EXPORT_W, y: ((e.clientY - rect.top) / rect.height) * EXPORT_H };
  };

  const start = (e: PointerEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const c = ctx();
    c.fillStyle = INK;
    c.beginPath();
    c.arc(last.current.x, last.current.y, 1.4, 0, Math.PI * 2);
    c.fill();
  };

  const move = (e: PointerEvent) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const p = point(e);
    const c = ctx();
    c.strokeStyle = INK;
    c.lineWidth = 2.8;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(last.current.x, last.current.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last.current = p;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const clear = () => {
    paintBackground();
    setTyped('');
    onChange('');
  };

  const renderTyped = (text: string) => {
    setTyped(text);
    paintBackground();
    const name = text.trim();
    if (!name) {
      onChange('');
      return;
    }
    const c = ctx();
    c.fillStyle = INK;
    c.textBaseline = 'middle';
    let size = 64;
    do {
      c.font = `italic ${size}px "Snell Roundhand", "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive`;
      size -= 4;
    } while (c.measureText(name).width > EXPORT_W - 48 && size > 18);
    c.fillText(name, 24, EXPORT_H / 2);
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const switchMode = (next: 'draw' | 'type') => {
    if (next === mode) return;
    setMode(next);
    clear();
  };

  return (
    <div>
      <div class="mb-2 inline-flex rounded-full border border-slate-300 bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Signature method">
        {(['draw', 'type'] as const).map((m) => (
          <button
            type="button"
            key={m}
            aria-pressed={mode === m}
            onClick={() => switchMode(m)}
            class={`min-h-9 rounded-full px-4 transition ${mode === m ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-brand-700'}`}
          >
            {m === 'draw' ? 'Draw' : 'Type'}
          </button>
        ))}
      </div>
      {mode === 'type' && (
        <input
          type="text"
          class="field-input mb-2"
          value={typed}
          maxLength={80}
          placeholder="Type your full name"
          aria-label="Type your full name to sign"
          autocomplete="name"
          onInput={(e) => renderTyped((e.currentTarget as HTMLInputElement).value)}
        />
      )}
      <div
        class={`relative overflow-hidden rounded-xl border bg-white ${invalid ? 'border-red-500 ring-4 ring-red-500/15' : 'border-slate-300'} ${
          mode === 'draw' ? 'border-dashed' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          id={id}
          width={EXPORT_W}
          height={EXPORT_H}
          role="img"
          aria-label={value ? 'Signature captured' : mode === 'draw' ? 'Signature area. Draw your signature with a mouse, finger or stylus.' : 'Signature preview'}
          aria-describedby={describedBy}
          class={`block aspect-[10/3] w-full ${mode === 'draw' ? 'cursor-crosshair touch-none' : ''}`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {!value && mode === 'draw' && (
          <span class="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-slate-400">Sign here</span>
        )}
        <span class="pointer-events-none absolute inset-x-6 bottom-9 border-b border-slate-200" aria-hidden="true" />
      </div>
      <div class="mt-2 flex items-center justify-between">
        <span class="text-xs text-slate-500">{mode === 'draw' ? 'Use your mouse, finger or stylus.' : 'Your typed name is used as your signature.'}</span>
        <button type="button" onClick={clear} class="text-brand-700 min-h-9 rounded-full px-3 text-xs font-semibold hover:underline">
          Clear
        </button>
      </div>
    </div>
  );
}
