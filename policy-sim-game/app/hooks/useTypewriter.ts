import { useState, useEffect, useRef, useCallback } from 'react';

/** Overall typing speed: every delay (per letter and the pauses after
 * punctuation) is multiplied by this. 1 = original speed; 0.5 = twice as fast. */
const SPEED_FACTOR = 0.5;

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
        timeoutRef.current = setTimeout(typeNextChar, delay * SPEED_FACTOR);
      } else {
        setIsTyping(false);
        setIsComplete(true);
      }
    };

    timeoutRef.current = setTimeout(typeNextChar, baseSpeed * SPEED_FACTOR);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, baseSpeed, start]);

  return { displayedText, isTyping, isComplete, skip };
}