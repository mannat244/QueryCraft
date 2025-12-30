"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function JsonToTable({ data }) {
  // 1. Normalize to string & strip accidental "use client" bits
  const raw = typeof data === "string" ? data.trim() : data;
  const cleaned =
    typeof raw === "string"
      ? raw.replace(/^["']?use client["']?;?/i, "").trim()
      : raw;

  // 2. If it’s still just plain text, render it directly
  if (typeof cleaned === "string" && !cleaned.startsWith("{")) {
    return <p className="text-zinc-300 whitespace-pre-wrap">{cleaned}</p>;
  }

  // 3. Try to parse JSON
  let parsed;
  try {
    parsed = typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;
  } catch {
    return (
      <p className="text-red-400">
        Invalid JSON — I couldn’t understand that response. Double-check the format?
      </p>
    );
  }

  // 4. No `output` field at all?
  if (!parsed || !Array.isArray(parsed.output)) {
    // Sometimes it might be just an array directly or different format.
    // Preserving logic but defaulting to original error message for now.
    return (
      <p className="text-zinc-500">
        🤔 Hmm, I was expecting an array under “output” but didn’t find one. Can you
        adjust your prompt or data shape?
      </p>
    );
  }

  // 5. Empty array
  if (parsed.output.length === 0) {
    return (
      <p className="text-zinc-400">
        No records to display—I got an empty list back. Try a different query or add
        more details.
      </p>
    );
  }

  // 6. Build headers & rows
  const headers = Object.keys(parsed.output[0]);

  return (
    <div className="w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900/50">
      <div className="overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader className="bg-zinc-800/50">
            <TableRow className="border-b-zinc-700 hover:bg-zinc-800/50">
              {headers.map((h) => (
                <TableHead key={h} className="text-zinc-300 font-semibold uppercase text-xs tracking-wider whitespace-nowrap px-4 py-3">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsed.output.map((row, i) => (
              <TableRow key={i} className="border-b-zinc-800 hover:bg-zinc-800/30 transition-colors">
                {headers.map((h) => (
                  <TableCell key={h} className="text-zinc-300 px-4 py-3 whitespace-nowrap">
                    {String(row[h] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default JsonToTable;
