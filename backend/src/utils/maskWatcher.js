const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MaskWatcher {
    constructor() {
        this.jsonDir = path.join(__dirname, '../../src/json');
        this.scriptPath = path.join(__dirname, '../scripts/create_masks.py');
        this.watcher = null;
    }

    createMaskForFile(jsonFile) {
        // Get just the filename without path
        const filename = path.basename(jsonFile);
        
        // Skip .gitkeep and other non-json files
        if (!filename.endsWith('.json') || filename === '.gitkeep') {
            return;
        }

        console.log(`\n🔄 Creating/Updating mask for: ${filename}`);

        // Spawn Python process
        const pythonProcess = spawn('python3', [
            this.scriptPath,
            '--file',
            filename
        ]);

        pythonProcess.stdout.on('data', (data) => {
            console.log(`📝 Mask creation output: ${data.toString().trim()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`❌ Mask creation error: ${data.toString().trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Successfully created/updated mask for ${filename}`);
            } else {
                console.error(`❌ Failed to create mask for ${filename} (exit code: ${code})`);
            }
        });

        pythonProcess.on('error', (error) => {
            console.error(`❌ Failed to start Python process: ${error}`);
        });
    }

    start() {
        if (this.watcher) {
            console.log('Watcher is already running');
            return;
        }

        console.log(`👀 Starting mask watcher on ${this.jsonDir}`);

        // Initialize watcher
        this.watcher = chokidar.watch(this.jsonDir, {
            ignored: /(^|[\/\\])\../, // Ignore dot files
            persistent: true,
            ignoreInitial: false, // Process existing files on startup
            awaitWriteFinish: {     // Wait for writes to finish
                stabilityThreshold: 1000,
                pollInterval: 100
            }
        });

        // Handle file add/change events
        this.watcher
            .on('add', (filePath) => {
                console.log(`📁 JSON file added: ${path.basename(filePath)}`);
                this.createMaskForFile(filePath);
            })
            .on('change', (filePath) => {
                console.log(`📝 JSON file modified: ${path.basename(filePath)}`);
                this.createMaskForFile(filePath);
            })
            .on('error', (error) => {
                console.error(`❌ Watcher error: ${error}`);
            });

        console.log('✅ Mask watcher started successfully');
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            console.log('Mask watcher stopped');
        }
    }
}

module.exports = new MaskWatcher(); 