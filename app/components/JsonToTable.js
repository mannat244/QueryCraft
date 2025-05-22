"use client";

import React from "react";

function JsonToTable({ data }) {
  // 1. Normalize to string & strip accidental "use client" bits
  const raw = typeof data === "string" ? data.trim() : data;
  const cleaned =
    typeof raw === "string"
      ? raw.replace(/^["']?use client["']?;?/i, "").trim()
      : raw;

  // 2. If it’s still just plain text, render it directly
  if (typeof cleaned === "string" && !cleaned.startsWith("{")) {
    return <p className="text-gray-700 whitespace-pre-wrap">{cleaned}</p>;
  }

  // 3. Try to parse JSON
  let parsed;
  try {
    parsed = typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;
  } catch {
    return (
      <p className="text-red-500">
        Invalid JSON — I couldn’t understand that response. Double-check the format?
      </p>
    );
  }

  // 4. No `output` field at all?
  if (!parsed || !Array.isArray(parsed.output)) {
    return (
      <p className="text-gray-500">
        🤔 Hmm, I was expecting an array under “output” but didn’t find one. Can you
        adjust your prompt or data shape?
      </p>
    );
  }

  // 5. Empty array
  if (parsed.output.length === 0) {
    return (
      <p className="text-gray-400">
        No records to display—I got an empty list back. Try a different query or add
        more details.
      </p>
    );
  }

  // 6. Build headers & rows
  const headers = Object.keys(parsed.output[0]);

  return (
    <table className="w-full border border-gray-300 mt-2 text-left">
      <thead className="bg-gray-100">
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className="border border-gray-300 px-4 py-2 text-zinc-700"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {parsed.output.map((row, i) => (
          <tr key={i}>
            {headers.map((h) => (
              <td key={h} className="border border-gray-300 px-4 py-2">
                {String(row[h] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default JsonToTable;
