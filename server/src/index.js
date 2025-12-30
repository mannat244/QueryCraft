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

import { applyDefaults } from './libs/configDefaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the src directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Apply defaults for any missing essential variables
applyDefaults();

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


app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        config: {
            node_env: process.env.NODE_ENV,
            threads: process.env.THREADS || '8'
        }
    });
});

app.get('/', (req, res) => {
    res.send('QueryCraft AI Engine is running v2.0 (Zero-Config Mode)');
});

app.listen(PORT, () => {
    console.log(`\n🚀 QueryCraft Engine started on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`📂 Working Dir: ${process.cwd()}\n`);
});
