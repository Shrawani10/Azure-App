import { useState, useRef, useCallback } from 'react';

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

export default function ChatInput({ onSend, onStop, isStreaming, t }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const canSend = text.trim() && !isStreaming;

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
          placeholder={t.inputPlaceholder}
          rows={1}
          className="flex-1 bg-transparent text-gray-800 text-sm placeholder-gray-400 resize-none outline-none leading-relaxed min-h-[24px] max-h-[120px] overflow-y-auto"
          style={{ height: '24px' }}
          disabled={isStreaming}
        />

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
