'use client';

import { useState, useRef, useEffect } from 'react';
import ChartDisplay from './ChartDisplay';
import SavedQueries from './SavedQueries';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  chartType?: string;
  chartConfig?: any;
  insight?: string;
  followUpQuestions?: string[];
  timestamp: number;
}

interface ChatAssistantProps {
  datasetId: string;
  userId: string;
  dataPreview: any[];
}

const RATE_LIMITS = {
  maxMessagesPerSession: 50,
  maxConversationHistory: 20,
};

const QUERY_TEMPLATES = [
  { icon: '📊', text: 'Show me the top 10 values in', category: 'Rankings' },
  { icon: '📈', text: 'What is the trend in', category: 'Trends' },
  { icon: '🔍', text: 'Find correlations between', category: 'Patterns' },
  { icon: '⚠️', text: 'Show me anomalies in', category: 'Quality' },
  { icon: '💰', text: 'Calculate the total of', category: 'Aggregations' },
  { icon: '📅', text: 'Compare current vs previous period', category: 'Comparisons' },
];

export default function ChatAssistant({
  datasetId,
  userId,
  dataPreview,
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const savedConversation = localStorage.getItem(`chat_${datasetId}_${userId}`);
    if (savedConversation) {
      try {
        const parsed = JSON.parse(savedConversation);
        const recentMessages = parsed.slice(-RATE_LIMITS.maxConversationHistory);
        setMessages(recentMessages);
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }
    // Mark initial load as complete after a short delay
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  }, [datasetId, userId]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${datasetId}_${userId}`, JSON.stringify(messages));
    }
  }, [messages, datasetId, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only auto-scroll if it's not the initial load (when restoring from localStorage)
    if (!isInitialLoad.current) {
      scrollToBottom();
    }
  }, [messages]);

  const handleTemplateClick = (templateText: string) => {
    setInput(templateText + ' ');
    setShowTemplates(false);
  };

  const handleFollowUpClick = (question: string) => {
    setInput(question);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    if (messages.length >= RATE_LIMITS.maxMessagesPerSession) {
      alert(`Session limit reached (${RATE_LIMITS.maxMessagesPerSession} messages). Please start a new conversation.`);
      return;
    }

    const userMessage = input.trim();
    setInput('');

    const newUserMessage: Message = {
      role: 'user',
      text: userMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        text: m.text,
      }));

      // Use enhanced chat API for better accuracy
      const response = await fetch('/api/chat-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          datasetId,
          userId,
          conversationHistory,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        text: data.response || data.answer,
        chartType: data.chartType,
        chartConfig: data.chartConfig,
        insight: data.insight,
        followUpQuestions: data.followUpQuestions || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Sorry, I encountered an error: ${error.message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectSavedQuery = (queryText: string) => {
    setInput(queryText);
    setShowSavedQueries(false);
  };

  const handleClearConversation = () => {
    if (confirm('Clear this conversation? This will reset the AI\'s context.')) {
      setMessages([]);
      localStorage.removeItem(`chat_${datasetId}_${userId}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all shadow-soft text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              className="px-4 py-2 bg-white border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 transition-all shadow-soft text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Chat
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSavedQueries(!showSavedQueries)}
          className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all shadow-soft text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {showSavedQueries ? 'Hide' : 'Show'} Saved Queries
        </button>
      </div>

      {/* Enhanced Query Engine Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 shadow-medium">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-900 mb-1">🚀 Advanced AI Query Engine Active</h3>
            <p className="text-xs text-blue-800 mb-2">
              Ask questions in plain English - I can handle datasets of ANY size with 90%+ accuracy!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1 text-green-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Instant answers
              </div>
              <div className="flex items-center gap-1 text-green-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                SQL powered
              </div>
              <div className="flex items-center gap-1 text-green-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Smart caching
              </div>
              <div className="flex items-center gap-1 text-green-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                High accuracy
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTemplates && (
        <div className="bg-white rounded-lg border border-neutral-200 shadow-soft p-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Quick Templates:</h3>
          <div className="flex flex-wrap gap-2">
            {QUERY_TEMPLATES.map((template, idx) => (
              <button
                key={idx}
                onClick={() => handleTemplateClick(template.text)}
                className="px-3 py-2 bg-forest-50 border border-forest-200 text-forest-700 rounded-lg hover:bg-forest-100 transition-all shadow-soft text-sm font-medium flex items-center gap-2"
              >
                <span>{template.icon}</span>
                <span>{template.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showSavedQueries && (
        <SavedQueries
          userId={userId}
          datasetId={datasetId}
          onSelectQuery={handleSelectSavedQuery}
        />
      )}

      <div className="flex flex-col h-[600px] bg-white rounded-lg border border-neutral-200 shadow-soft">
        <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-forest-50 to-navy-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <svg className="w-6 h-6 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-neutral-900">AI Assistant</h2>
                <p className="text-sm text-neutral-600">Powered by Google Gemini (FREE)</p>
              </div>
            </div>
            <div className="text-xs text-neutral-500">
              {messages.length}/{RATE_LIMITS.maxMessagesPerSession} messages
            </div>
          </div>
        </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-gradient-to-br from-forest-50 to-navy-50 rounded-xl mb-4 shadow-soft">
              <svg
                className="w-12 h-12 text-forest-600 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <p className="text-neutral-900 font-semibold mb-2">Start a conversation!</p>
            <p className="text-sm text-neutral-600 mb-4">Try asking:</p>
            <div className="mt-3 space-y-2">
              <div onClick={() => handleFollowUpClick("What are the main trends in this data?")} className="inline-block bg-white px-4 py-2 rounded-lg shadow-soft border border-neutral-200 text-sm text-neutral-700 hover:border-forest-300 transition-colors cursor-pointer">
                "What are the main trends in this data?"
              </div>
              <div onClick={() => handleFollowUpClick("Show me the top 5 values")} className="inline-block bg-white px-4 py-2 rounded-lg shadow-soft border border-neutral-200 text-sm text-neutral-700 hover:border-forest-300 transition-colors cursor-pointer mx-2">
                "Show me the top 5 values"
              </div>
              <div onClick={() => handleFollowUpClick("Summarize this dataset")} className="inline-block bg-white px-4 py-2 rounded-lg shadow-soft border border-neutral-200 text-sm text-neutral-700 hover:border-forest-300 transition-colors cursor-pointer">
                "Summarize this dataset"
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-4 shadow-soft ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-forest-500 to-forest-600 text-white'
                  : 'bg-gradient-to-br from-neutral-50 to-neutral-100 text-neutral-900 border border-neutral-200'
              }`}
            >
              <div className="prose prose-sm max-w-none">
                {message.text.split('\n').map((line, i) => {
                  if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                    return (
                      <div key={i} className="ml-4 mb-1 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{line.replace(/^[-•]\s*/, '')}</span>
                      </div>
                    );
                  }
                  return line.trim() ? <p key={i} className="mb-2">{line}</p> : null;
                })}
              </div>

              {message.insight && (
                <div className="mt-4 pt-3 border-t border-neutral-300">
                  <p className="text-sm font-semibold mb-1 flex items-center text-forest-700">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Key Insight:
                  </p>
                  <p className="text-sm italic text-neutral-700">{message.insight}</p>
                </div>
              )}

              {message.chartType && message.chartConfig && dataPreview && dataPreview.length > 0 && (
                <div className="mt-4 bg-white rounded-lg p-4 border border-neutral-200 shadow-soft">
                  <p className="text-xs text-neutral-600 mb-2 font-medium">Suggested Visualization:</p>
                  <ChartDisplay
                    type={message.chartType as any}
                    data={dataPreview}
                    xKey={message.chartConfig.xKey}
                    yKey={message.chartConfig.yKey}
                  />
                </div>
              )}

              {message.role === 'assistant' && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-300">
                  <p className="text-xs text-neutral-600 mb-2 font-medium">Suggested follow-up questions:</p>
                  <div className="space-y-2">
                    {message.followUpQuestions.map((question, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleFollowUpClick(question)}
                        className="block w-full text-left px-3 py-2 bg-white border border-forest-200 rounded-lg text-sm text-forest-700 hover:bg-forest-50 transition-all"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-4 shadow-soft border border-neutral-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-forest-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-navy-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-maroon-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-neutral-200 bg-neutral-50">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your data..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 disabled:bg-neutral-100 disabled:cursor-not-allowed text-neutral-900 placeholder-neutral-500 transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-forest-500 to-forest-600 text-white rounded-lg hover:from-forest-600 hover:to-forest-700 disabled:from-neutral-300 disabled:to-neutral-300 disabled:cursor-not-allowed transition-all shadow-soft hover:shadow-medium font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
