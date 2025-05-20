"use client";
import React from "react";

function JsonToTable({ data }) {
  let parsedData;

  try {
    parsedData = typeof data === "string" ? JSON.parse(data) : data;
  } catch (err) {
    return <p className="text-red-500">Invalid JSON data</p>;
  }

  if (!Array.isArray(parsedData.output) || parsedData.output.length === 0) {
    return (
      <p className="text-gray-400">
        Hmm, I couldn’t generate a valid response for that. Try rewording your question or adding more detail?
      </p>
    );
  }

  const headers = Object.keys(parsedData.output[0]);

  return (
    <table className="border-collapse border border-gray-300 w-full text-left mt-2">
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="border border-gray-300 px-4 py-2 bg-gray-100 text-zinc-700"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {parsedData.output.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {headers.map((header) => (
              <td key={header} className="border border-gray-300 px-4 py-2">
                {row[header]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default JsonToTable;
