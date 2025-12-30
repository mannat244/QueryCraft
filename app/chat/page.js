"use client"
import React, { useState, useRef, useEffect } from 'react'
import JsonToTable from '../components/JsonToTable'
import { ToastContainer, toast, Bounce } from 'react-toastify';
import CodeBlock from '../components/CodeBlock'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { ScrollArea } from "@/components/ui/scroll-area" 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, Database, LogOut, SendHorizontal, BrainCircuit, Brain, Wand2, RefreshCw, Settings } from "lucide-react"

export default function ChatPage() {

  const [selectedLLM, setSelectedLLM] = useState('openai/gpt-oss-20b');
  const [groqModels, setGroqModels] = useState([]);
  const [selectedVectorStore, setSelectedVectorStore] = useState('Local');
  const [syncing, setSyncing] = useState(false);
  const [useGpu, setUseGpu] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [llamaServerRunning, setLlamaServerRunning] = useState(false);
  const [availableProviders, setAvailableProviders] = useState({
    ollama: true,
    llamacpp: true,
    gemini: false,
    groq: false,
    azure: false
  });
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);

  // Mapping for friendly names
  const MODEL_MAPPING = {
    'llama3-70b-8192': 'Llama 3 70B',
    'llama3-8b-8192': 'Llama 3 8B',
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'gemma-7b-it': 'Gemma 7B',
    'gemma2-9b-it': 'Gemma 2 9B',
    'llama-3.1-70b-versatile': 'Llama 3.1 70B',
    'llama-3.1-8b-instant': 'Llama 3.1 8B',
    'llama-guard-3-8b': 'Llama Guard 3 8B',
    'llama3-groq-70b-8192-tool-use-preview': 'Llama 3 Groq Tool Use 70B',
    'llama3-groq-8b-8192-tool-use-preview': 'Llama 3 Groq Tool Use 8B',
    // Add generic fallback formatted later
  };

  const getDisplayName = (id) => {
    if (MODEL_MAPPING[id]) return MODEL_MAPPING[id];
    // Fallback: capitalize and replace dashes, remove common prefixes
    return id.replace('openai/', '').replace('google/', '').split('/').pop();
  };


  const getBadge = (modelId) => {
    // Private badge for local models
    if (modelId.includes('Local')) {
      return <span className="ml-2 text-[10px] text-purple-400 font-medium">Private</span>;
    }
    // Recommended badge for specific models
    if (modelId.includes('gpt-oss') || modelId === 'llama-3.1-70b-versatile') {
      return <span className="ml-2 text-[10px] text-blue-400 font-medium">Recommended</span>;
    }
    return null;
  };


  React.useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        console.log('[Models API] Response:', data);
        if (data.providers) {
          setAvailableProviders(data.providers);

          // Auto-select the first available provider if Groq is not available
          if (!data.providers.groq) {
            if (data.providers.ollama) setSelectedLLM('Local (Ollama)');
            else if (data.providers.llamacpp) setSelectedLLM('Local (Llama.cpp)');
            else if (data.providers.gemini) setSelectedLLM('Gemini');
          }
        }
        if (data.models && data.models.length > 0) {
          const modelIds = data.models.map(m => m.id);
          setGroqModels(modelIds);
          // If Groq is available, pick a high-quality default
          if (data.providers?.groq) {
            const bestDefault = modelIds.find(m => m.includes('llama-3.1-70b')) || modelIds[0];
            setSelectedLLM(bestDefault);
          }
        }
      })
      .catch(err => console.error("Failed to load models", err));

    // Fetch suggested questions based on schema
    fetch('/api/schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectorStore: 'Local' })
    })
      .then(res => res.json())
      .then(schemaData => {
        if (schemaData.schema) {
          // Generate suggestions using the schema
          return fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              schema: schemaData.schema,
              llm: selectedLLM === 'Local (Llama.cpp)' || selectedLLM === 'Local (Ollama)' ? 'gpt-oss-safeguard-20b' : selectedLLM
            })
          });
        }
      })
      .then(res => res && res.json())
      .then(data => {
        if (data && data.suggestions) {
          setSuggestedQuestions(data.suggestions);
        }
      })
      .catch(err => console.error("Failed to load suggestions", err));
  }, []);

  // State Management




  const [input, setinput] = useState("")
  const [messages, setMessages] = useState([]) // Memory state
  const [query, setquery] = useState("")
  const [text, settext] = useState("")
  const [output, setoutput] = useState()
  const [table, settable] = useState(false)
  const [sql, setsql] = useState()
  const [loading, setloading] = useState(false)
  const [error, setError] = useState(null)
  const [think, setthink] = useState(false)
  const [thoughts, setThoughts] = useState([])

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, output, loading, text, sql, table])

  const handleLogout = async () => {
    toast.info("Logging out...", { theme: "dark", transition: Bounce });
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleSyncSchema = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectorStore: 'Local' })
      });
      if (response.ok) {
        toast.success('Schema Synced locally!', { theme: "dark", transition: Bounce });
      } else {
        toast.error('Sync failed', { theme: "dark", transition: Bounce });
      }
    } catch (e) {
      toast.error('Sync error', { theme: "dark", transition: Bounce });
    }
    setSyncing(false);
  };

  const handleModelSelect = async (model) => {
    setSelectedLLM(model);
    if (model === 'Local (Llama.cpp)') {
      const toastId = toast.loading("Starting Local Llama Server...", { theme: "dark" });
      try {
        // Assume Next.js rewrites /api/* to the Express server, so we use /api/llm/start?
        // Wait, standard setup usually maps /api/* -> server. 
        // Based on existing fetch('/api/models'), let's try /api/llm/start.
        // If not mapped, we might need a Next.js route handler proxy. 
        // But let's assume direct proxy first or try direct fetch.

        const res = await fetch('/api/llm/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ useGpu: useGpu, threads: 8 })
        });
        const data = await res.json();

        if (res.ok) {
          setLlamaServerRunning(true);
          toast.update(toastId, { render: data.message || "Llama Server Ready", type: "success", isLoading: false, autoClose: 3000, transition: Bounce });
        } else {
          const errorMsg = data.error || data.message || "Failed to start server";
          let helpText = "";

          if (errorMsg.includes("model") || errorMsg.includes("not found")) {
            helpText = " Check if gemma-3-4b-it.gguf exists in server/src/localLLM/models/";
          } else if (errorMsg.includes("ENOENT") || errorMsg.includes("llama-server")) {
            helpText = " llama-server.exe not found. See GitHub README for setup.";
          }

          toast.update(toastId, {
            render: errorMsg + helpText,
            type: "error",
            isLoading: false,
            autoClose: 8000,
            transition: Bounce
          });
        }
      } catch (err) {
        console.error("Start Error", err);
        toast.update(toastId, { render: "Error contacting server manager", type: "error", isLoading: false, autoClose: 5000, transition: Bounce });
      }
    }
  };

  const abortController = useRef(null);

  const handleInput = async () => {
    // Abort previous request if active
    if (loading && abortController.current) {
      abortController.current.abort();
      setloading(false);
      return;
    }

    setoutput("")
    setError(null)
    setloading(true)
    if (!input.trim()) return

    const userQuery = input;
    setquery(input);
    setinput("")
    setThoughts([]);

    // Create new controller
    abortController.current = new AbortController();

    try {
      // Prepare history for context (Last 6 messages)
      const history = messages.map(m => ({ role: m.role, content: m.content })).slice(-6);

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.current.signal,
        body: JSON.stringify({
          'query': userQuery,
          'think': think,
          'llm': selectedLLM,
          'vectorStore': selectedVectorStore,
          'history': history
        })
      })

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      // STREAMING READER
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.type === 'log') {
              setThoughts(prev => [...prev, chunk.message]);
            } else if (chunk.type === 'result') {
              // Final Result
              const data = chunk.data;
              setloading(false);
              settable(data.table);
              settext(data.text);
              setsql(data.sql);
              setoutput(JSON.stringify(data));

              // Update Memory
              setMessages(prev => [
                ...prev,
                { role: 'user', content: userQuery },
                {
                  role: 'assistant',
                  content: data.text || "Here are the results.",
                  sql: data.sql,
                  table: data.table,
                  output: JSON.stringify(data)
                }
              ]);
            } else if (chunk.type === 'error') {
              throw new Error(chunk.message);
            }
          } catch (e) {
            console.error("Stream Parse Error", e);
          }
        }
      }
    } catch (error) {
      console.error(error)
      setError(error.message || "An unexpected error occurred.")
      setloading(false)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-black text-zinc-100 font-sans overflow-hidden">

      {/* Header */}
      <header className="shrink-0 h-16 border-b border-zinc-900 bg-black/50 backdrop-blur px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { window.location.href = "/" }}>
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Database className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden md:block">QueryCraft AI</span>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors min-w-[200px] justify-between">
                {getDisplayName(selectedLLM)} <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-zinc-200 max-h-[600px] overflow-y-auto w-[240px]">

              <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Local
              </div>
              <DropdownMenuItem onClick={() => handleModelSelect('Local (Ollama)')} className="hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white cursor-pointer flex items-center">
                <span>Local (Ollama)</span>
                {getBadge('Local (Ollama)')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModelSelect('Local (Llama.cpp)')} className="hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white cursor-pointer flex items-center">
                <span>Local (Llama.cpp)</span>
                {getBadge('Local (Llama.cpp)')}
              </DropdownMenuItem>

              <Separator className="my-1 bg-zinc-800" />

              <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Cloud Providers
              </div>
              {availableProviders.gemini && (
                <DropdownMenuItem onClick={() => handleModelSelect('Gemini')} className="hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white cursor-pointer">
                  Google Gemini
                </DropdownMenuItem>
              )}
              {availableProviders.azure && (
                <DropdownMenuItem onClick={() => handleModelSelect('Azure')} className="hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white cursor-pointer">
                  Azure OpenAI
                </DropdownMenuItem>
              )}
              {!availableProviders.gemini && !availableProviders.azure && (
                <div className="px-2 py-2 text-[10px] text-zinc-600 italic">
                  No cloud keys configured
                </div>
              )}

              {groqModels.length > 0 && (
                <>
                  <Separator className="my-1 bg-zinc-800" />
                  <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Groq Cloud
                  </div>
                  {groqModels.map(modelId => (
                    <DropdownMenuItem key={modelId} onClick={() => handleModelSelect(modelId)} className="hover:bg-zinc-900 focus:bg-zinc-900 focus:text-white cursor-pointer flex items-center">
                      <span className="truncate">{getDisplayName(modelId)}</span>
                      {getBadge(modelId)}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedVectorStore === 'Local' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncSchema}
              disabled={syncing}
              className="bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border-zinc-800 border transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''} ${!syncing && "md:mr-2"}`} />
              <span className="hidden md:inline">{syncing ? 'Syncing...' : 'Sync Schema'}</span>
            </Button>
          )}

          {/* Settings Toggle Trigger */}
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className={`text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 ${showSettings ? 'text-white bg-zinc-800' : ''}`}>
            <span className="sr-only">Settings</span>
            <Settings className="h-5 w-5" />
          </Button>

          {/* Simple Settings Popover (Absolute) */}
          {showSettings && (
            <div className="absolute top-16 right-20 bg-zinc-950 border border-zinc-800 p-4 rounded-xl w-64 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Server Management</h3>



              {selectedLLM === 'Local (Llama.cpp)' && llamaServerRunning && (
                <>
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-green-400">●</span>
                    <span className="text-zinc-400">Llama Server Active</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-1 leading-relaxed">
                    <span className="text-zinc-400">Model:</span> gemma-3-4b-it
                  </p>
                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                    <span className="text-zinc-400">Mode:</span> CPU (10 threads)
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      const toastId = toast.loading("Stopping server...", { theme: "dark" });
                      try {
                        const res = await fetch('/api/llm/stop', { method: 'POST' });
                        const data = await res.json();
                        if (res.ok) {
                          setLlamaServerRunning(false);
                          setShowSettings(false); // Close settings dialog
                          toast.update(toastId, { render: data.message, type: "success", isLoading: false, autoClose: 2000 });
                        } else {
                          toast.update(toastId, { render: data.message, type: "error", isLoading: false, autoClose: 3000 });
                        }
                      } catch (e) {
                        toast.update(toastId, { render: "Failed to stop", type: "error", isLoading: false, autoClose: 3000 });
                      }
                    }}
                    className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50"
                  >
                    Shutdown Server
                  </Button>
                </>
              )}

              {selectedLLM === 'Local (Llama.cpp)' && !llamaServerRunning && (
                <div className="text-xs text-zinc-500 text-center py-2">
                  <p className="mb-2 text-amber-400">Server is stopped.</p>
                  <p className="text-zinc-600 mb-2">Select "Local (Llama.cpp)" from dropdown to start.</p>
                  <a
                    href="https://github.com/yourusername/QueryCraft#setup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-[10px]"
                  >
                    Setup Instructions →
                  </a>
                </div>
              )}

              {selectedLLM === 'Local (Ollama)' && (
                <div className="text-xs text-zinc-500 text-center py-2">
                  <p className="mb-2">Ollama manages its own server.</p>
                  <p className="text-zinc-600 mb-2">Use <code className="bg-zinc-900 px-1 rounded">ollama stop</code> in terminal.</p>
                  <p className="text-amber-400 text-[10px]">If queries fail, check if Ollama is running.</p>
                </div>
              )}

              {selectedLLM !== 'Local (Llama.cpp)' && selectedLLM !== 'Local (Ollama)' && (
                <div className="text-xs text-zinc-500 text-center py-2">
                  Select a local model to manage server
                </div>
              )}
            </div>
          )}

          <Separator orientation="vertical" className="h-6 bg-zinc-700" />

          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-400 hover:text-red-400 hover:bg-red-950/50">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area - Flex Column */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-h-0">

        {/* Messages Area - Grows to fill space */}
        <div className="flex-1 w-full overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto pt-8 pb-8 px-4 md:px-0 flex flex-col justify-end min-h-full">

            {/* Empty State */}
            {!query && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 my-auto h-full flex-1">
                <div className="bg-zinc-800/50 p-4 rounded-full">
                  <Wand2 className="h-8 w-8 text-zinc-400" />
                </div>
                <h2 className="text-2xl font-semibold text-zinc-200">What can I do?</h2>
                <p className="text-zinc-400 max-w-sm">
                  Ask me anything about your database. I can write queries, explain data, and visualize results.
                </p>

                {/* Suggested Questions */}
                {suggestedQuestions.length > 0 && (
                  <div className="flex flex-col items-center gap-3 mt-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">Try asking:</p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                      {suggestedQuestions.map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setinput(question);
                            // Auto-submit
                            setTimeout(() => {
                              const form = document.querySelector('form');
                              if (form) form.requestSubmit();
                            }, 100);
                          }}
                          className="px-4 py-2 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 hover:text-white rounded-full text-sm transition-all duration-200 border border-zinc-700/50 hover:border-zinc-600"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* MESSAGE HISTORY (Previous Chat) */}
            {(output && !loading && messages.length >= 2 ? messages.slice(0, -2) : messages).map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
                {msg.role === 'user' ? (
                  <div className="bg-zinc-800/80 text-white px-4 py-3 rounded-2xl rounded-br-sm max-w-[85%] text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="flex gap-4 max-w-4xl w-full">
                    <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-zinc-700 bg-zinc-800 shrink-0">
                      <AvatarFallback className="text-xs">
                        <Brain className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4 overflow-hidden min-w-0">
                      {msg.sql && (
                        <div className="w-full max-w-[85vw] md:max-w-none overflow-x-auto rounded-lg">
                          <CodeBlock code={msg.sql} />
                        </div>
                      )}
                      {msg.table && msg.output && (
                        <div className="w-full max-w-[85vw] md:max-w-none overflow-x-auto rounded-lg">
                          <JsonToTable data={msg.output} />
                        </div>
                      )}
                      {msg.content && (
                        <div className="text-zinc-300 text-sm leading-relaxed">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* User Query (Current) */}
            {query && (
              <div className="flex justify-end mb-6">
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(query);
                    toast.success("Query copied!", { theme: "dark", transition: Bounce });
                  }}
                  className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-none max-w-[80%] cursor-pointer hover:bg-blue-700 transition shadow-lg"
                >
                  {query}
                </div>
              </div>
            )}

            {/* MIND SHIMMER (Thinking State - Moved Here) */}
            {(loading || thoughts.length > 0) && !output && (
              <div className="flex gap-4 max-w-4xl w-full mb-8 animate-in fade-in slide-in-from-bottom-2">
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-zinc-700 bg-zinc-800 shrink-0">
                  <AvatarFallback className="text-xs">
                    <BrainCircuit className="h-4 w-4 md:h-5 md:w-5 text-purple-400 animate-pulse" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3 flex items-center">
                  <div className="w-full font-mono text-sm min-h-[24px] flex items-center">
                    {thoughts.length > 0 ? (
                      <div key={thoughts[thoughts.length - 1]} className="animate-in fade-in slide-in-from-left-1 duration-500 w-full">
                        <span className="bg-gradient-to-r from-zinc-700 via-zinc-300 to-zinc-700 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent font-medium block truncate">
                          {thoughts[thoughts.length - 1]}
                        </span>
                      </div>
                    ) : (
                      loading && (
                        <span className="bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent text-xs">
                          Initializing Agentic Workflow...
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Bot Response */}
            {output && !loading && (
              <div className="flex gap-4 max-w-4xl w-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-zinc-700 bg-zinc-800 shrink-0">
                  <AvatarFallback className="text-xs">
                    <Brain className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4 overflow-hidden min-w-0">
                  {!think && text && (
                    <div className="prose prose-invert max-w-none text-zinc-300 text-sm md:text-base leading-relaxed break-words">
                      <p>{text}</p>
                    </div>
                  )}

                  {sql && (
                    <div className="w-full max-w-[85vw] md:max-w-none overflow-x-auto rounded-lg">
                      <CodeBlock code={sql} />
                    </div>
                  )}

                  {table && (
                    <div className="w-full max-w-[85vw] md:max-w-none overflow-x-auto rounded-lg">
                      <JsonToTable data={output} />
                    </div>
                  )}

                  {think && text && (
                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-sm font-medium">
                        <BrainCircuit className="h-4 w-4" /> Analysis
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-sm md:text-base">{text}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Static at bottom */}
        <div className="w-full bg-black p-4 pb-8 md:pb-6 border-t border-zinc-900 relative shrink-0 z-20">
          <div className="max-w-4xl mx-auto relative bg-zinc-950/80 rounded-xl border border-zinc-800 shadow-2xl focus-within:ring-1 focus-within:ring-zinc-700 transition-all">
            <Input
              autoFocus
              value={input}
              onChange={(e) => setinput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInput()}
              placeholder="Ask a question..."
              className="bg-transparent border-none text-base h-12 md:h-14 pl-4 pr-12 md:pr-32 focus-visible:ring-0 placeholder:text-zinc-600"
            />

            <div className="absolute right-2 top-2 bottom-2 md:top-3 md:bottom-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setthink(!think)}
                className={`hidden md:flex h-9 px-3 text-xs font-medium transition-colors border border-transparent ${think ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              >
                {think ? "Think Mode On" : "Think Mode"}
              </Button>

              <Button
                size="icon"
                onClick={handleInput}
                className="h-8 w-8 md:h-10 md:w-10 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <SendHorizontal className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>

      </main>

      <ToastContainer position="top-center" autoClose={5000} theme="dark" transition={Bounce} />
    </div>
  )
}
