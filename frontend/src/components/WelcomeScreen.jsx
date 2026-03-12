const ICONS = {
  bug: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2L12 6L16 2"/>
      <path d="M9 6c-3 0-5 2-5 5a7 7 0 0 0 14 0c0-3-2-5-5-5H9z"/>
      <line x1="12" y1="11" x2="12" y2="16"/>
      <line x1="9.5" y1="13" x2="14.5" y2="13"/>
      <line x1="4" y1="9" x2="2" y2="7"/>
      <line x1="20" y1="9" x2="22" y2="7"/>
      <line x1="4" y1="14" x2="2" y2="16"/>
      <line x1="20" y1="14" x2="22" y2="16"/>
    </svg>
  ),
  scheme: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  ),
  water: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L6 10a6 6 0 0 0 12 0L12 2z"/>
    </svg>
  ),
  plant: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12"/>
      <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z"/>
      <path d="M12 17c0 0-4-1-6-4"/>
    </svg>
  ),
};

export default function WelcomeScreen({ t, onSuggestionClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 overflow-y-auto">
      {/* Plant Icon */}
      <div className="w-32 h-32 rounded-full overflow-hidden border border-primary-100 mb-5 bg-primary-50">
        <img src="/Image.jpg" alt="Kisan logo" className="w-full h-full object-cover" />
      </div>

      {/* Welcome text */}
      <h2 className="text-2xl font-bold text-primary-700 text-center mb-2 leading-snug">
        {t.welcome}
      </h2>
      <p className="text-gray-500 text-sm text-center max-w-sm leading-relaxed mb-8">
        {t.subtitle}
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {t.suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(suggestion.text)}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md hover:bg-primary-50 transition-all text-left group animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="w-9 h-9 shrink-0 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
              {ICONS[suggestion.icon] || ICONS.plant}
            </span>
            <span className="text-sm text-gray-700 group-hover:text-primary-700 leading-snug font-medium">
              {suggestion.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
