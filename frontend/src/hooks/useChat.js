import { useState, useRef, useCallback, useMemo } from 'react';
import { streamChat } from '../services/api';

/**
 * Core chat hook. Manages messages and streaming.
 *
 * @param {string} language - Currently selected language code
 * @returns {{
 *   messages: Array,
 *   isStreaming: boolean,
 *   error: string|null,
 *   sendMessage: Function,
 *   clearChat: Function,
 * }}
 */
export function useChat(language) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;
    setError(null);

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
      displayText: text.trim(),
    };

    // Placeholder for the streaming assistant reply
    const assistantMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // Build history to send to API (all past messages + the new user one)
    // We snapshot before state update so we get the right history
    const apiHistory = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    abortRef.current = new AbortController();

    try {
      for await (const item of streamChat({
        messages: apiHistory,
        language,
        sessionId,
        signal: abortRef.current.signal,
      })) {
        if (item.type === 'text') {
          // Strip [docN] refs and any leading comma/space before them
          const cleaned = item.content.replace(/[,\s]*\[doc\d+\]/gi, '');
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + cleaned };
            return copy;
          });
        } else if (item.type === 'citations') {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, citations: item.data };
            return copy;
          });
        }
      }

      // Post-stream: clean up orphaned punctuation left by citation removal
      // e.g. "productivity , ." → "productivity."
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant' && last.content) {
          const fixed = last.content
            .replace(/,\s*,/g, ',')    // double commas
            .replace(/\s+,/g, ',')     // space before comma
            .replace(/,\s*\./g, '.')   // ", ." → "."
            .replace(/\s+\./g, '.')    // " ." → "."
            .trim();
          copy[copy.length - 1] = { ...last, content: fixed };
        }
        return copy;
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled — keep whatever was streamed so far
        return;
      }
      setError(err.message || 'Unknown error');
      // Remove the empty assistant placeholder on hard errors
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.content === '' ? prev.slice(0, -1) : prev;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages, language, isStreaming]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, error, sendMessage, clearChat, stopStreaming };
}
