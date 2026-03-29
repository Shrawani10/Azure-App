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
  const isSupported = SpeechRecognition !== null;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
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
