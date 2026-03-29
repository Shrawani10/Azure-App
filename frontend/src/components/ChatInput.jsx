import { useState, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 12L22 2 12 22 10 13 2 12z"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function ChatInput({ onSend, onStop, isStreaming, language, t }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const canSend = text.trim() && !isStreaming;

  const handleTranscript = useCallback((transcript) => {
    setText((prev) => {
      const joined = prev.trim() ? prev.trim() + ' ' + transcript : transcript;
      // Resize textarea to fit new text
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }
      });
      return joined;
    });
    textareaRef.current?.focus();
  }, []);

  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition({ onTranscript: handleTranscript });

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(language);
    }
  }, [isListening, startListening, stopListening, language]);

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    onSend(text);
    setText('');
    textareaRef.current?.focus();
  }, [canSend, text, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  return (
    <div className="px-4 pb-3 pt-2 border-t border-gray-100 bg-white shrink-0">
      <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary-300 transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? (t.listening || 'Listening...') : t.inputPlaceholder}
          rows={1}
          className="flex-1 bg-transparent text-gray-800 text-sm placeholder-gray-400 resize-none outline-none leading-relaxed min-h-[24px] max-h-[120px] overflow-y-auto"
          style={{ height: '24px' }}
          disabled={isStreaming}
        />

        {/* Mic button — only shown if browser supports speech recognition */}
        {isSupported && !isStreaming && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-500'
            }`}
            title={isListening ? (t.stopListening || 'Stop listening') : (t.speak || 'Speak')}
            aria-label={isListening ? (t.stopListening || 'Stop listening') : (t.speak || 'Speak')}
          >
            <MicIcon active={isListening} />
          </button>
        )}

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shrink-0"
            title="Stop"
            aria-label="Stop generating"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
              canSend
                ? 'bg-primary-700 hover:bg-primary-800 text-white shadow-sm'
                : 'bg-gray-300 text-gray-400 cursor-not-allowed'
            }`}
            title={t.send}
            aria-label={t.send}
          >
            <SendIcon />
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-1.5">
        {t.poweredBy}
      </p>
    </div>
  );
}
