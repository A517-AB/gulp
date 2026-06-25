import { useState } from 'react';

// Using a mock state for layout instead of raw useChat to avoid backend route requirement for this test page.
export function AIChatPage() {
  const [messages, setMessages] = useState<{ id: string, role: string, content: string }[]>([
      { id: '1', role: 'ai', content: 'Hello! I am a simulated Vercel AI chat interface running locally.' }
  ]);
  const [input, setInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
  };
  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim()) return;
      setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input }]);
      setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-surface text-fg-primary overflow-hidden">
      <div className="p-4 border-b border-hair shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium">Vercel AI Chat</h1>
          <p className="text-xs text-fg-dim">Experimental layout</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-xs leading-relaxed ${
              m.role === 'user' ? 'bg-purple-500/20 text-purple-100 border border-purple-500/30' : 'bg-raised border border-hair'
            }`}>
              <div className="font-medium text-3xs opacity-70 mb-1 tracking-wide uppercase">
                {m.role === 'user' ? 'You' : 'AI'}
              </div>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-raised border-t border-hair shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 bg-surface border border-hair rounded-md px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50 transition-colors"
            value={input}
            placeholder="Say something..."
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-md text-xs font-medium transition-colors border border-purple-500/30"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
