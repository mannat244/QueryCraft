import express from 'express';
import { listModels } from '../providers/groq.js';
import { getAvailableProviders } from '../libs/providerCheck.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const models = await listModels();

        // Filter: Context >= 8000 AND Name does NOT contain 'tts' or 'whisper'
        const filtered = models.filter(m =>
            (m.context_window >= 8000) &&
            !m.id.toLowerCase().includes('tts') &&
            !m.id.toLowerCase().includes('whisper')
        );

        const formatted = filtered.map(m => ({
            id: m.id,
            name: `${m.id} (${m.owned_by})`
        }));

        res.json({
            models: formatted,
            providers: getAvailableProviders()
        });
    } catch (error) {
        console.error("Failed to fetch models:", error);
        res.json({
            models: [],
            providers: getAvailableProviders(),
            error: error.message
        });
    }
});

export default router;
