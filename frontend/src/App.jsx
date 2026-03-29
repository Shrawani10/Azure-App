import { useState, useEffect, useRef } from 'react';
import Header from './components/Header.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ChatMessage from './components/ChatMessage.jsx';
import ChatInput from './components/ChatInput.jsx';
import { useChat } from './hooks/useChat.js';
import { TRANSLATIONS, LANGUAGES } from './i18n/translations.js';

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="mx-4 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="text-sm text-red-700">{message}</span>
      </div>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  // Persist language preference
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kisan-lang') || 'hi';
  });

  const { messages, isStreaming, error, sendMessage, clearChat, stopStreaming } = useChat(language);
  const [dismissedError, setDismissedError] = useState(false);
  const messagesEndRef = useRef(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS['hi'];
  const isRTL = LANGUAGES.find(l => l.code === language)?.rtl ?? false;

  // Persist language
  useEffect(() => {
    localStorage.setItem('kisan-lang', language);
  }, [language]);

  // Reset dismissed error when a new error arrives
  useEffect(() => {
    if (error) setDismissedError(false);
  }, [error]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-2 sm:p-4"
      style={{
        background: 'linear-gradient(135deg, #c8e6c9 0%, #e8f5e9 40%, #f5fbf5 70%, #ffffff 100%)',
      }}
    >
      {/* Chat widget card */}
      <div
        className="w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          maxWidth: '680px',
          height: 'min(92vh, 860px)',
          minHeight: '0',
        }}
      >
        {/* Header */}
        <Header
          language={language}
          onLanguageChange={handleLanguageChange}
          onNewChat={clearChat}
          t={t}
        />

        {/* Chat body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            /* Welcome screen */
            <WelcomeScreen t={t} onSuggestionClick={(text) => sendMessage(text)} />
          ) : (
            /* Message list */
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} t={t} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error banner */}
          {error && !dismissedError && (
            <ErrorBanner
              message={`${t.error} (${error})`}
              onDismiss={() => setDismissedError(true)}
            />
          )}
        </div>

        {/* Input area */}
        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          language={language}
          t={t}
        />
      </div>
    </div>
  );
}
