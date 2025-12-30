import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import askRoute from './routes/ask.js';
import schemaRoute from './routes/schema.js';

import modelsRoute from './routes/models.js';
import llamaRoute from './routes/llama.js';
import suggestionsRoute from './routes/suggestions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the src directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/ask', askRoute);
app.use('/schema', schemaRoute);
app.use('/models', modelsRoute);
app.use('/llm', llamaRoute);
app.use('/suggestions', suggestionsRoute);


app.get('/', (req, res) => {
    res.send('QueryCraft AI Engine is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
