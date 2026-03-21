import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function KisanAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-primary-700 flex items-center justify-center shrink-0 shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s-8-5-8-11a8 8 0 0 1 16 0c0 6-8 11-8 11z" fill="#4aba6a"/>
        <path d="M12 22V14" stroke="#d8f3dc" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 18c0 0-2.5-2-4-4" stroke="#d8f3dc" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 15c0 0 2-2 3.5-3.5" stroke="#d8f3dc" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0 shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </div>
  );
}

export default function ChatMessage({ message, t }) {
  const isUser = message.role === 'user';
  const text = isUser ? message.displayText : message.content;

  if (isUser) {
    return (
      <div className="flex flex-row-reverse items-end gap-2 animate-slide-up px-4 py-1">
        <UserAvatar />
        <div className="max-w-[78%] flex flex-col items-end gap-1">
          {text && (
            <div className="bg-primary-700 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-sm">
              {text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-end gap-2 animate-slide-up px-4 py-1">
      <KisanAvatar />
      <div className="max-w-[78%]">
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-800 leading-relaxed shadow-sm kisan-prose">
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <TypingDots />
          )}

          {/* Source citations */}
          {message.citations?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide mb-1">Sources</p>
              <div className="flex flex-wrap gap-1">
                {message.citations.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 text-[10px] text-gray-400 max-w-[180px] truncate" title={c.title || c.filepath || `Document ${i + 1}`}>
                    <span className="font-bold text-primary-400 shrink-0">[{i + 1}]</span>
                    {c.title || c.filepath || `Doc ${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-5">
      <span className="typing-dot"/>
      <span className="typing-dot"/>
      <span className="typing-dot"/>
    </div>
  );
}
