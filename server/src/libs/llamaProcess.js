import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Convert URL to path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track the active process
let llamaProcess = null;

export function isLlamaServerRunning() {
    return llamaProcess !== null && !llamaProcess.killed;
}

export function stopLlamaServer() {
    if (llamaProcess) {
        console.log("[LlamaManager] Stopping server...");
        llamaProcess.kill();
        llamaProcess = null;
        return true;
    }
    return false;
}

// Graceful shutdown when Node.js exits
process.on('SIGINT', () => {
    console.log('\n[LlamaManager] Received SIGINT, shutting down gracefully...');
    stopLlamaServer();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[LlamaManager] Received SIGTERM, shutting down gracefully...');
    stopLlamaServer();
    process.exit(0);
});

process.on('exit', () => {
    stopLlamaServer();
});

export function startLlamaServer(config = {}) {
    return new Promise((resolve, reject) => {
        if (isLlamaServerRunning()) {
            console.log("[LlamaManager] Server already running.");
            resolve("Already running");
            return;
        }

        console.log("[LlamaManager] Starting llama-server...");

        // Log system hardware info
        const cpus = os.cpus();
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(1);
        console.log(`[Hardware] CPU: ${cpus[0].model} (${cpus.length} cores)`);
        console.log(`[Hardware] RAM: ${totalMem}GB`);

        // Paths are relative to server/src (process.cwd())
        // Adjust these if nodemon runs from a different root. 
        // Based on `ls` output: server/src/localLLM/llama-server.exe

        // We assume process.cwd() is server/src based on standard nodemon usage.
        // Construction absolute paths to be safe.
        // parent of libs is src
        const srcDir = path.join(__dirname, '..');
        const exePath = path.join(srcDir, 'localLLM', 'llama-server.exe');
        const modelPath = path.join(srcDir, 'localLLM', 'models', 'gemma-3-4b-it.gguf');

        console.log(`[LlamaManager] Exe: ${exePath}`);
        console.log(`[LlamaManager] Model: ${modelPath}`);

        // Configuration Logic
        const useGpu = config.useGpu !== false; // Default to TRUE
        // Optimized for RTX 3050 4GB: 33 layers fits in VRAM, rest on CPU
        // This prevents OOM and keeps inference fast
        const gpuLayers = useGpu ? '33' : '0';
        const threads = config.threads || process.env.THREADS || '8'; // i5-12450H has 10 cores

        console.log(`[LlamaManager] Config: GPU=${useGpu} (-ngl ${gpuLayers}), Threads=${threads}`);
        console.log(`[LlamaManager] Optimized for RTX 3050 4GB + i5-12450H`);
        console.log(`[LlamaManager] GPU Acceleration: ${useGpu ? '✅ ENABLED (33 layers on GPU, rest on CPU)' : '❌ DISABLED (CPU-only mode)'}`);

        const args = [
            '-m', modelPath,
            '--port', '8080',
            '-ngl', gpuLayers,
            '-t', threads,
            '-c', '2048', // Context size (reduce if needed)
            '--n-gpu-layers', gpuLayers
        ];

        const child = spawn(exePath, args, {
            detached: false,
            shell: true
        });

        // Listen for startup success (hacky but effective: look for "listening" or wait a bit)
        // Or just resolve immediately and let the health check handle it.
        let gpuDetected = false;

        child.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[LlamaServer] ${output}`);

            // Detect GPU/CUDA initialization
            if (output.toLowerCase().includes('cuda') || output.toLowerCase().includes('gpu')) {
                gpuDetected = true;
                console.log('🎮 [GPU] CUDA/GPU acceleration detected in llama-server output!');
            }
            if (output.toLowerCase().includes('vulkan')) {
                console.log('🎮 [GPU] Vulkan acceleration detected!');
            }
        });

        child.stderr.on('data', (data) => {
            const output = data.toString();
            // Only log critical errors
            if (output.toLowerCase().includes('error') ||
                output.toLowerCase().includes('failed') ||
                output.toLowerCase().includes('fatal') ||
                output.toLowerCase().includes('cuda')) {
                console.error(`[LlamaServer ERR] ${output.trim()}`);

                // Detect GPU initialization
                if (output.toLowerCase().includes('cuda') && !output.toLowerCase().includes('error')) {
                    gpuDetected = true;
                    console.log('🎮 [GPU] CUDA detected in stderr (initialization logs)');
                }
            }
        });

        child.on('close', (code) => {
            console.log(`[LlamaManager] Process exited with code ${code}`);
            if (!gpuDetected && useGpu) {
                console.warn('⚠️  [GPU] No GPU/CUDA messages detected. Server may be running in CPU-only mode.');
                console.warn('⚠️  [GPU] Check CUDA drivers if you expected GPU acceleration.');
            }
            llamaProcess = null;
        });

        child.on('error', (err) => {
            console.error("[LlamaManager] Failed to start process:", err);
            reject(err);
        });

        llamaProcess = child;

        // Give it 2 seconds to print GPU info
        setTimeout(() => {
            if (!gpuDetected && useGpu) {
                console.log('ℹ️  [GPU] No GPU messages in first 2s. This is normal if CUDA is working silently.');
                console.log('ℹ️  [GPU] Monitor Task Manager → Performance → GPU to verify acceleration.');
            }
            resolve("Started");
        }, 2000);
    });
}
