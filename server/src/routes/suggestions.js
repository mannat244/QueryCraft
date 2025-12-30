import express from 'express';
import { generateSQL } from '../libs/llm.js';

const router = express.Router();

const SUGGESTION_PROMPT = `You are a helpful database assistant. Based on the following database schema, suggest 3-4 interesting and useful questions a user might want to ask.

Rules:
- Questions should be practical and insightful
- Cover different aspects: aggregations, relationships, trends, comparisons
- Keep questions concise and natural
- Return ONLY a JSON array of strings, no other text

Example output:
["What is the average salary by department?", "Who are the top 5 highest paid employees?", "How many employees joined this year?"]

Schema:
{{SCHEMA}}

Return only the JSON array:`;

router.post('/', async (req, res) => {
    try {
        const { schema, llm } = req.body;

        if (!schema) {
            return res.status(400).json({ error: 'Schema required' });
        }

        // Use provided LLM or default to Groq gpt-oss-safeguard-20b
        const selectedLLM = llm || 'gpt-oss-safeguard-20b';

        const prompt = SUGGESTION_PROMPT.replace('{{SCHEMA}}', schema);

        // Generate suggestions using the LLM
        const response = await generateSQL(selectedLLM, prompt, schema, '', '', schema, []);

        // Parse the response - it should be a JSON array
        let suggestions = [];
        try {
            // The response might be wrapped in the standard format
            if (response.text) {
                // Try to extract JSON array from text
                const match = response.text.match(/\[.*\]/s);
                if (match) {
                    suggestions = JSON.parse(match[0]);
                }
            } else if (Array.isArray(response)) {
                suggestions = response;
            }
        } catch (e) {
            console.error('Failed to parse suggestions:', e);
            // Fallback suggestions
            suggestions = [
                "What is the average salary?",
                "Show me all employees",
                "How many records are in each table?"
            ];
        }

        res.json({ suggestions });
    } catch (error) {
        console.error('Suggestions error:', error);
        // Return fallback suggestions on error
        res.json({
            suggestions: [
                "What is the average salary?",
                "Show me all employees",
                "How many records are in each table?"
            ]
        });
    }
});

export default router;
