import { useState, useEffect, useRef, useCallback } from 'react';
import { loadOptions } from '../utils/gameOptions';

/** Overall typing speed: every delay (per letter and the pauses after
 * punctuation) is multiplied by this. 1 = original speed; 0.5 = twice as fast.
 * The player's "Text speed" option picks one ("Instant" shows the text at once).
 * Read when each text starts, so a change in Options applies to the next text. */
const SPEED_FACTORS = { normal: 0.5, fast: 0.2 } as const;

export function useTypewriter(text: string, baseSpeed: number = 70, start: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  const skip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
  }, [text]);

  useEffect(() => {
    if (!start || !text) return;

    const textSpeed = loadOptions().textSpeed;
    if (textSpeed === 'instant') {
      setDisplayedText(text);
      setIsTyping(false);
      setIsComplete(true);
      return;
    }
    const factor = SPEED_FACTORS[textSpeed] ?? SPEED_FACTORS.normal;

    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);
    currentIndexRef.current = 0;

    const typeNextChar = () => {
      if (currentIndexRef.current < text.length) {
        setDisplayedText(text.slice(0, currentIndexRef.current + 1));
        
        const currentChar = text[currentIndexRef.current];
        let delay = baseSpeed;
        
        if (['.', '!', '?'].includes(currentChar)) {
          delay = baseSpeed + 800; 
        } else if ([',', ':', ';'].includes(currentChar)) {
          delay = baseSpeed + 400; 
        } else if (currentChar === '\n') {
          delay = baseSpeed + 500; 
        }

        delay += Math.random() * 30; // Jitter for realism

        currentIndexRef.current++;
        timeoutRef.current = setTimeout(typeNextChar, delay * factor);
      } else {
        setIsTyping(false);
        setIsComplete(true);
      }
    };

    timeoutRef.current = setTimeout(typeNextChar, baseSpeed * factor);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, baseSpeed, start]);

  return { displayedText, isTyping, isComplete, skip };
}