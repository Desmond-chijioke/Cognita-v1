import { useRef, useState, useCallback, useEffect } from 'react';

export type TTSStatus = 'idle' | 'speaking' | 'paused';

/**
 * Baseline chars-per-second at rate=1  (≈130 WPM × 5.5 avg chars/word ÷ 60s)
 * Used as a fallback when onboundary doesn't fire (Chrome + most system voices).
 */
const BASE_CPS = 12;

export function useTTS() {
  const [status, setStatus] = useState<TTSStatus>('idle');

  const textRef      = useRef('');
  const rateRef      = useRef(1);
  const fromCharRef  = useRef(0);   // char offset the current utterance started from
  const resumePos    = useRef(0);   // best known position (boundary event or estimate)
  const startTime    = useRef(0);   // Date.now() when speech began (for time estimate)
  const pausingRef   = useRef(false);
  const currentUtt   = useRef<SpeechSynthesisUtterance | null>(null);

  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const _speakFrom = useCallback(
    (text: string, rate: number, fromChar: number) => {
      if (!supported) return;

      window.speechSynthesis.cancel();

      // Trim from `fromChar` — resume picks up approximately mid-text
      const slice = text.slice(fromChar).trim();
      if (!slice) { setStatus('idle'); return; }

      textRef.current     = text;
      rateRef.current     = rate;
      fromCharRef.current = fromChar;
      resumePos.current   = fromChar; // reset before new utterance starts
      startTime.current   = 0;

      const utt = new SpeechSynthesisUtterance(slice);
      currentUtt.current  = utt;
      utt.rate = rate;

      utt.onstart = () => {
        if (currentUtt.current !== utt) return;
        startTime.current = Date.now();
        setStatus('speaking');
      };

      utt.onend = () => {
        if (currentUtt.current !== utt) return;
        resumePos.current = 0;
        setStatus('idle');
      };

      utt.onerror = () => {
        if (currentUtt.current !== utt) return;
        if (pausingRef.current) {
          // Our own intentional cancel() for pause — do not reset position or status.
          pausingRef.current = false;
          return;
        }
        // Genuine error or cancelled by another card starting playback.
        resumePos.current = 0;
        setStatus('idle');
      };

      // onboundary gives us accurate word positions when it fires.
      // Chrome fires it inconsistently depending on the selected voice;
      // the time estimate in pause() covers the gaps.
      utt.onboundary = (e: SpeechSynthesisEvent) => {
        if (currentUtt.current !== utt) return;
        resumePos.current = fromChar + e.charIndex;
      };

      window.speechSynthesis.speak(utt);
    },
    [supported],
  );

  const play = useCallback(
    (text: string, rate = 1) => {
      resumePos.current = 0;
      _speakFrom(text, rate, 0);
    },
    [_speakFrom],
  );

  const pause = useCallback(() => {
    if (!supported || status !== 'speaking') return;

    // ── Time-based position estimate ──────────────────────────────────────────
    // onboundary is unreliable in Chrome with many system voices.
    // Calculate how far the voice has likely read and take the maximum of
    // (last boundary position) vs (time estimate), so we never go backwards.
    if (startTime.current > 0) {
      const elapsedSec = (Date.now() - startTime.current) / 1000;
      const estimated  = fromCharRef.current + Math.floor(elapsedSec * BASE_CPS * rateRef.current);
      const clamped    = Math.min(estimated, textRef.current.length - 1);
      if (clamped > resumePos.current) {
        resumePos.current = clamped;
      }
    }

    pausingRef.current = true;   // tell onerror this cancel is intentional
    window.speechSynthesis.cancel();
    setStatus('paused');         // set synchronously — onerror fires later (async)
  }, [supported, status]);

  const resume = useCallback(() => {
    if (!supported || status !== 'paused') return;
    _speakFrom(textRef.current, rateRef.current, resumePos.current);
  }, [supported, status, _speakFrom]);

  const stop = useCallback(() => {
    if (!supported) return;
    currentUtt.current = null;   // silence the async onerror that cancel() will trigger
    window.speechSynthesis.cancel();
    resumePos.current = 0;
    setStatus('idle');
  }, [supported]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return { play, pause, resume, stop, status, supported };
}
