import { useState } from 'react';

export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative bg-zinc-950 my-5 border scrollbar-dark border-zinc-800 text-white p-4 rounded-xl">
      <pre className="overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
      <button 
        onClick={copyToClipboard} 
        className="absolute top-2 right-2 bg-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-600"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}