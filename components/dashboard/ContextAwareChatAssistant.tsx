'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import { AnalyticsContext, VisualizationsContext, trackActivity } from '@/lib/context-collectors';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  confidence?: number;
  sql?: string;
}

interface ContextAwareChatAssistantProps {
  datasetId: string;
  userId: string;
  dataPreview: any[];
  pageContext: AnalyticsContext | VisualizationsContext;
  onContextUpdate?: (activity: string) => void;
}

export default function ContextAwareChatAssistant({
  datasetId,
  userId,
  dataPreview,
  pageContext,
  onContextUpdate,
}: ContextAwareChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Load conversation history
  useEffect(() => {
    const savedConversation = localStorage.getItem(`chat_context_${pageContext.pageType}_${datasetId}_${userId}`);
    if (savedConversation) {
      try {
        const parsed = JSON.parse(savedConversation);
        setMessages(parsed.slice(-20)); // Keep last 20 messages
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    }

    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  }, [datasetId, userId, pageContext.pageType]);

  // Save conversation history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `chat_context_${pageContext.pageType}_${datasetId}_${userId}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, datasetId, userId, pageContext.pageType]);

  // Auto-scroll to bottom (only for new messages)
  useEffect(() => {
    if (!isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Generate context-aware suggestions
  const suggestions = useMemo(() => {
    if (pageContext.pageType === 'analytics') {
      const ctx = pageContext as AnalyticsContext;
      const suggestions: string[] = [];

      if (ctx.insights.length > 0) {
        suggestions.push(`Explain the "${ctx.insights[0].title}" insight`);
        suggestions.push(`What caused ${ctx.insights[0].title.toLowerCase()}?`);
      }

      if (ctx.forecast?.available) {
        suggestions.push(`Tell me about the ${ctx.forecast.trend || 'predicted'} forecast`);
      }

      suggestions.push(`What are the biggest anomalies in my data?`);
      suggestions.push(`Show me key trends in ${ctx.statistics.columns[0] || 'the data'}`);

      return suggestions.slice(0, 4);
    } else {
      const ctx = pageContext as VisualizationsContext;
      const suggestions: string[] = [];

      if (ctx.currentChart.topValues && ctx.currentChart.topValues.length > 0) {
        suggestions.push(`Why is "${ctx.currentChart.topValues[0]}" the highest?`);
      }

      if (ctx.appliedFilters.length > 0) {
        suggestions.push(`What if I remove the ${ctx.appliedFilters[0].column} filter?`);
      }

      suggestions.push(`What's the best chart type for this data?`);
      suggestions.push(`Show me correlations in my data`);

      return suggestions.slice(0, 4);
    }
  }, [pageContext]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setShowSuggestions(false);

    // Track activity
    trackActivity('clicked', 'send_message', { message: userMessage });
    onContextUpdate?.('Sent message');

    const newUserMessage: Message = {
      role: 'user',
      text: userMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat-context-aware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          datasetId,
          userId,
          pageContext, // Send full page context!
          conversationHistory: messages.slice(-5),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        text: data.response || data.answer,
        timestamp: Date.now(),
        confidence: data.confidence,
        sql: data.sql,
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    trackActivity('clicked', 'suggestion', { suggestion });
    onContextUpdate?.(`Selected suggestion: ${suggestion}`);
  };

  const handleClearConversation = () => {
    if (confirm('Clear this conversation? This will reset the AI\'s context.')) {
      setMessages([]);
      localStorage.removeItem(`chat_context_${pageContext.pageType}_${datasetId}_${userId}`);
      setShowSuggestions(true);
    }
  };

  return (
    <Card className="shadow-large">
      {/* Context-Aware Header */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            {pageContext.pageType === 'analytics' ? (
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              {pageContext.pageType === 'analytics' ? '📊 Analytics Expert' : '📈 Chart Wizard'}
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                Context-Aware
              </span>
            </h4>
            <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
              {pageContext.pageType === 'analytics' ? (
                <>
                  I can see your <strong>{(pageContext as AnalyticsContext).insights.length} insights</strong>
                  {(pageContext as AnalyticsContext).forecast?.available && (
                    <>, <strong>forecast data</strong></>
                  )}
                  , and <strong>{(pageContext as AnalyticsContext).statistics.rowCount.toLocaleString()} rows</strong>.
                  Ask me anything about what you're viewing!
                </>
              ) : (
                <>
                  I'm viewing your <strong>{(pageContext as VisualizationsContext).currentChart.type} chart</strong> with{' '}
                  <strong>{(pageContext as VisualizationsContext).chartData.length} data points</strong>
                  {(pageContext as VisualizationsContext).appliedFilters.length > 0 && (
                    <> and <strong>{(pageContext as VisualizationsContext).appliedFilters.length} active filters</strong></>
                  )}
                  . I understand exactly what you're looking at!
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Context-Aware Suggestions */}
      {showSuggestions && messages.length === 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Smart suggestions based on what you're viewing:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-full hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm hover:shadow"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="h-96 overflow-y-auto mb-4 space-y-3 px-2">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-3">
              <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-900 mb-1">
              Start a Context-Aware Conversation
            </h3>
            <p className="text-sm text-neutral-600">
              I understand everything on this page. Try the suggestions above!
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-gradient-to-r from-neutral-100 to-neutral-50 text-neutral-900 border border-neutral-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.confidence && message.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-neutral-200 flex items-center gap-2 text-xs text-neutral-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {(message.confidence * 100).toFixed(0)}% confidence
                  </div>
                )}
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 rounded-lg px-4 py-2 border border-neutral-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            pageContext.pageType === 'analytics'
              ? 'Ask about insights, forecasts, or trends...'
              : 'Ask about your chart, filters, or data...'
          }
          className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || loading}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-semibold"
        >
          Send
        </button>
      </div>

      {/* Actions */}
      {messages.length > 0 && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleClearConversation}
            className="text-xs text-neutral-600 hover:text-red-600 transition-colors underline"
          >
            Clear conversation
          </button>
        </div>
      )}
    </Card>
  );
}
