import React, { useState, useRef, useEffect } from 'react';
import { ParsedSheet, ChatMessage } from '../types';
import { analyzeDataWithGemini } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AiChatProps {
  sheet: ParsedSheet | null;
}

const AiChat: React.FC<AiChatProps> = ({ sheet }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hola! Soy tu asistente de datos. Sube un archivo y selecciona una hoja para comenzar a analizar.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sheet) {
      setMessages([
        { 
          role: 'model', 
          text: `He analizado la hoja **"${sheet.name}"**. Veo ${sheet.columns.length} columnas y ${sheet.data.length} filas. \n\nPuedes preguntarme cosas como:\n- ¿Cuál es el promedio de [Columna]?\n- Resume los datos principales.\n- Encuentra tendencias en los datos.` 
        }
      ]);
    }
  }, [sheet]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sheet) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Convert internal chat history format for the service
    const historyForService = messages.map(m => ({
        role: m.role,
        text: m.text
    }));

    try {
      const responseText = await analyzeDataWithGemini(userMessage.text, sheet, historyForService);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, hubo un error al procesar tu solicitud.', isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sheet) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-colors">
        <div className="bg-slate-200 dark:bg-slate-700 p-4 rounded-full mb-4">
          <svg className="h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 className="text-slate-700 dark:text-slate-300 font-medium">Chat Inactivo</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Carga un archivo Excel para activar el asistente de IA.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Gemini Data Analyst
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-bl-none'
                }
                ${msg.isError ? 'border-red-300 bg-red-50 text-red-800' : ''}
              `}
            >
               {msg.role === 'model' ? (
                 <div className="prose prose-sm max-w-none prose-slate dark:prose-invert">
                   <ReactMarkdown>{msg.text}</ReactMarkdown>
                 </div>
               ) : (
                 msg.text
               )}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre los datos..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Gemini puede cometer errores. Verifica la información importante.</span>
        </div>
      </form>
    </div>
  );
};

export default AiChat;