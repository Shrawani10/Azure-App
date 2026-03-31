import { useState, useRef, useCallback, useEffect } from 'react';

// Maps app language codes to BCP 47 locales for the Web Speech API
const LANG_TO_BCP47 = {
  hi: 'hi-IN',
  kn: 'kn-IN',
  or: 'or-IN',
  en: 'en-IN',
  mr: 'mr-IN',
  ur: 'ur-PK',
  gu: 'gu-IN',
  pa: 'pa-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
};

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export function useSpeechRecognition({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const interimRef = useRef('');
  const isSupported = SpeechRecognition !== null;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    interimRef.current = '';
    setIsListening(false);
  }, []);

  const startListening = useCallback((language) => {
    if (!isSupported) return;
    // Stop any existing session first
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANG_TO_BCP47[language] || 'hi-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Pick the longest alternative for better accuracy
        let best = '';
        for (let j = 0; j < event.results[i].length; j++) {
          if (event.results[i][j].transcript.length > best.length) {
            best = event.results[i][j].transcript;
          }
        }

        if (event.results[i].isFinal) {
          finalTranscript += best;
        } else {
          interimTranscript += best;
        }
      }

      if (finalTranscript) {
        interimRef.current = '';
        onTranscript(finalTranscript.trim(), 'final');
      } else if (interimTranscript) {
        interimRef.current = interimTranscript;
        onTranscript(interimTranscript.trim(), 'interim');
      }
    };

    recognition.onerror = () => {
      interimRef.current = '';
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      interimRef.current = '';
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onTranscript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { isListening, isSupported, startListening, stopListening };
}
