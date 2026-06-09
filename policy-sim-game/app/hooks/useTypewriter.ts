import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text: string, baseSpeed: number = 70, start: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Keep track of the timeout so we can clean it up if the component unmounts
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!start || !text) return;

    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);

    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        
        const currentChar = text[currentIndex];
        let delay = baseSpeed;
        
        // Increased pause multipliers for more "dramatic" pauses
        if (['.', '!', '?'].includes(currentChar)) {
          delay = baseSpeed + 800; // Longer pause at full stops
        } else if ([',', ':', ';'].includes(currentChar)) {
          delay = baseSpeed + 400; // Longer pause for clauses
        } else if (currentChar === '\n') {
          delay = baseSpeed + 500; // Longer pause for new paragraphs
        }

        currentIndex++;
        timeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        setIsTyping(false);
        setIsComplete(true);
      }
    };

    // Kick off the typing
    timeoutRef.current = setTimeout(typeNextChar, baseSpeed);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, baseSpeed, start]);

  return { displayedText, isTyping, isComplete };
}