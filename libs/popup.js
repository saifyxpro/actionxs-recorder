/**
 * ActionXS Recorder - Modern Popup Script
 * Manages the extension popup interface with modern ES6+ features
 */

class ActionRecorderPopup {
    // Storage keys constants
    static STORAGE_KEYS = {
        ACTION_LIST: 'ACTION_LIST',
        RECORDER_STATUS: 'RECORDER_STATUS'
    };

    // Recording status constants
    static STATUS = {
        RECORDING: 'REC',
        WAITING: 'WAIT',
        PAUSED: 'PAUSE',
        COMPLETED: 'OK'
    };

    constructor() {
        this.elements = this.initializeElements();
        this.isInitialized = false;
        this.init();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        const elements = {
            // Main containers
            emptyState: document.querySelector('.empty-state'),
            actionsList: document.querySelector('.actions-list'),
            
            // Status indicators
            recordingStatus: document.querySelector('.status-text.recording'),
            pausedStatus: document.querySelector('.status-text.paused'),
            
            // Buttons
            recordBtn: document.querySelector('.record-btn'),
            stopBtn: document.querySelector('.stop-btn'),
            pauseBtn: document.querySelector('.pause-btn'),
            restartBtn: document.querySelector('.restart-btn'),
            exportBtn: document.querySelector('.export-btn'),
            helpBtn: document.querySelector('.help-btn'),
            
            // Toast notification
            toast: document.querySelector('.toast'),
            toastMessage: document.querySelector('.toast-message')
        };

        // Log missing elements for debugging
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`Element not found: ${key}`);
            }
        });

        return elements;
    }

    /**
     * Initialize the popup application
     */
    async init() {
        try {
            // Wait a bit for the service worker to be ready
            await this.waitForServiceWorker();
            await this.setupEventListeners();
            await this.loadInitialState();
            this.setupStorageListener();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            
            // Try fallback initialization without service worker
            try {
                console.log('Attempting fallback initialization...');
                await this.setupEventListeners();
                await this.loadInitialStateFromStorage(); // Load from storage directly
                this.setupStorageListener();
                this.isInitialized = true;
                this.showToast('Extension loaded (limited mode)', 'warning', 3000);
            } catch (fallbackError) {
                console.error('Fallback initialization failed:', fallbackError);
                this.showToast('Connection error. Please reload extension.', 'error', 5000);
                this.showFallbackUI(error);
            }
        }
    }

    /**
     * Wait for service worker to be ready
     */
    async waitForServiceWorker(maxAttempts = 5) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await this.ensureServiceWorkerReady();
                console.log('Service worker ready after', attempt, 'attempts');
                return;
            } catch (error) {
                const errorMsg = error?.message || error?.toString() || 'Unknown error';
                console.warn(`Service worker not ready, attempt ${attempt}/${maxAttempts}: ${errorMsg}`);
                if (attempt < maxAttempts) {
                    // Wait progressively longer between attempts
                    await new Promise(resolve => setTimeout(resolve, attempt * 500));
                } else {
                    throw new Error(`Service worker failed to become ready after ${maxAttempts} attempts. Last error: ${errorMsg}`);
                }
            }
        }
    }

    /**
     * Set up all event listeners
     */
    async setupEventListeners() {
        const { recordBtn, stopBtn, pauseBtn, restartBtn, exportBtn, helpBtn } = this.elements;

        // Recording controls
        recordBtn?.addEventListener('click', () => this.handleStartRecording());
        stopBtn?.addEventListener('click', () => this.handleStopRecording());
        pauseBtn?.addEventListener('click', () => this.handlePauseRecording());
        restartBtn?.addEventListener('click', () => this.handleRestartRecording());
        exportBtn?.addEventListener('click', (e) => this.handleExportActions(e));
        helpBtn?.addEventListener('click', () => this.handleShowHelp());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Handle keyboard shortcuts for accessibility
     */
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'r':
                    event.preventDefault();
                    if (this.elements.recordBtn && !this.elements.recordBtn.classList.contains('hidden')) {
                        this.handleStartRecording();
                    }
                    break;
                case 's':
                    event.preventDefault();
                    if (this.elements.stopBtn && !this.elements.stopBtn.classList.contains('hidden')) {
                        this.handleStopRecording();
                    }
                    break;
                case 'e':
                    event.preventDefault();
                    if (this.elements.exportBtn && !this.elements.exportBtn.classList.contains('hidden')) {
                        this.handleExportActions();
                    }
                    break;
            }
        }
        
        // Escape key to close/cancel
        if (event.key === 'Escape' && this.elements.stopBtn && !this.elements.stopBtn.classList.contains('hidden')) {
            this.handleStopRecording();
        }
    }

    /**
     * Load initial state from storage
     */
    async loadInitialState() {
        try {
            const data = await this.getStorageData([
                ActionRecorderPopup.STORAGE_KEYS.ACTION_LIST,
                ActionRecorderPopup.STORAGE_KEYS.RECORDER_STATUS
            ]);
            
            const status = data[ActionRecorderPopup.STORAGE_KEYS.RECORDER_STATUS];
            const actions = data[ActionRecorderPopup.STORAGE_KEYS.ACTION_LIST] || [];
            
            this.updateUI(status);
            this.renderActionsList(actions);
        } catch (error) {
            console.error('Failed to load initial state:', error);
        }
    }

    /**
     * Load initial state from storage (fallback method)
     */
    async loadInitialStateFromStorage() {
        return this.loadInitialState();
    }

    /**
     * Set up storage change listener
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;

            const { RECORDER_STATUS, ACTION_LIST } = ActionRecorderPopup.STORAGE_KEYS;
            
            if (changes[RECORDER_STATUS]?.newValue) {
                this.updateUI(changes[RECORDER_STATUS].newValue);
            }
            
            if (changes[ACTION_LIST]?.newValue) {
                this.renderActionsList(changes[ACTION_LIST].newValue);
            }
        });
    }

    /**
     * Get data from chrome storage
     */
    getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (data) => {
                resolve(data);
            });
        });
    }

    /**
     * Send message to background script with timeout and retry logic
     */
    sendMessage(message, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Message timeout: Background script did not respond'));
            }, timeout);

            const attemptMessage = () => {
                try {
                    chrome.runtime.sendMessage(message, (response) => {
                        clearTimeout(timeoutId);
                        
                        if (chrome.runtime.lastError) {
                            const errorMessage = chrome.runtime.lastError.message;
                            console.error('Chrome runtime error:', errorMessage);
                            
                            // Check for specific connection errors and provide helpful messages
                            if (errorMessage.includes('Receiving end does not exist') || 
                                errorMessage.includes('Could not establish connection')) {
                                reject(new Error('Background script not ready. Please reload the extension and try again.'));
                            } else {
                                reject(new Error(errorMessage));
                            }
                        } else if (!response) {
                            reject(new Error('No response from background script - service worker may be inactive'));
                        } else if (!response.success) {
                            reject(new Error(response.error || 'Unknown error from background script'));
                        } else {
                            resolve(response);
                        }
                    });
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(new Error(`Failed to send message: ${error.message}`));
                }
            };

            // Try to wake up the service worker first
            this.ensureServiceWorkerReady().then(() => {
                attemptMessage();
            }).catch(() => {
                // If service worker check fails, still try the message
                attemptMessage();
            });
        });
    }

    /**
     * Ensure service worker is ready before sending messages
     */
    async ensureServiceWorkerReady() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Service worker ping timeout after 3 seconds'));
            }, 3000);

            try {
                // Try a simple ping message to wake up the service worker
                chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
                    clearTimeout(timeout);
                    
                    if (chrome.runtime.lastError) {
                        const error = chrome.runtime.lastError;
                        reject(new Error(`Chrome runtime error: ${error.message}`));
                    } else if (response && response.success !== undefined) {
                        // Got a valid response from service worker
                        resolve(response);
                    } else {
                        reject(new Error('Invalid response from service worker'));
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                reject(new Error(`Failed to send ping message: ${error.message}`));
            }
        });
    }

    /**
     * Update UI based on recording status
     */
    updateUI(status) {
        const { emptyState, actionsList, recordingStatus, pausedStatus } = this.elements;
        const { recordBtn, stopBtn, pauseBtn, restartBtn, exportBtn } = this.elements;
        
        // Hide all elements initially
        this.hideElements([emptyState, recordingStatus, pausedStatus, recordBtn, stopBtn, pauseBtn, restartBtn, exportBtn]);

        switch (status) {
            case ActionRecorderPopup.STATUS.RECORDING:
            case ActionRecorderPopup.STATUS.WAITING:
                this.showElements([actionsList, recordingStatus, stopBtn, pauseBtn]);
                if (pauseBtn) pauseBtn.textContent = chrome.i18n.getMessage('pause_recording') || 'Pause';
                break;

            case ActionRecorderPopup.STATUS.PAUSED:
                this.showElements([actionsList, pausedStatus, stopBtn, pauseBtn]);
                if (pauseBtn) pauseBtn.textContent = chrome.i18n.getMessage('resume_recording') || 'Resume';
                break;

            case ActionRecorderPopup.STATUS.COMPLETED:
                this.showElements([actionsList, restartBtn, exportBtn]);
                const actionCount = actionsList?.querySelectorAll('li').length || 0;
                if (exportBtn) {
                    exportBtn.textContent = `${chrome.i18n.getMessage('export_actions') || 'Export'} (${actionCount})`;
                }
                break;

            default:
                this.showElements([emptyState, recordBtn]);
                if (actionsList) actionsList.innerHTML = '';
                break;
        }
    }

    /**
     * Render the actions list
     */
    renderActionsList(actions) {
        const { actionsList } = this.elements;
        if (!actionsList || !Array.isArray(actions)) return;

        if (actions.length === 0) {
            actionsList.innerHTML = '';
            return;
        }

        const html = actions.map((action, index) => this.renderActionItem(action, index + 1)).join('');
        actionsList.innerHTML = html;
    }

    /**
     * Render individual action item
     */
    renderActionItem(action, number) {
        const actionName = chrome.i18n.getMessage(action.type) || action.type;
        let actionInfo = '';

        // Generate action-specific info
        switch (action.type) {
            case 'gotoUrl':
                actionInfo = `<span class="highlight">${this.escapeHtml(action.config.url)}</span>`;
                break;
            case 'click':
                actionInfo = `<span class="highlight">${this.escapeHtml(action.config.selector)}</span>`;
                break;
            case 'inputContent':
                actionInfo = `<span class="highlight">${this.escapeHtml(action.config.content)}</span>`;
                break;
            case 'keyboard':
                actionInfo = `<span class="highlight">${this.escapeHtml(action.config.type)}</span>`;
                break;
            case 'scrollPage':
                actionInfo = `<span class="highlight">${action.config.distance} px</span>`;
                break;
            case 'waitTime':
                actionInfo = `<span class="highlight">${action.config.timeout} ms</span>`;
                break;
        }

        return `
            <li role="listitem">
                <div class="action-number" aria-label="Action ${number}">${number}</div>
                <div class="action-content">
                    <div class="action-type">${this.escapeHtml(actionName)}</div>
                    ${actionInfo ? `<p class="action-info">${actionInfo}</p>` : ''}
                </div>
            </li>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show elements using CSS classes
     */
    showElements(elements) {
        elements.forEach(element => {
            if (element && element.classList) {
                element.classList.remove('hidden');
            }
        });
    }

    /**
     * Hide elements using CSS classes
     */
    hideElements(elements) {
        elements.forEach(element => {
            if (element && element.classList) {
                element.classList.add('hidden');
            }
        });
    }

    /**
     * Show toast notification using CSS classes
     */
    showToast(message, type = 'info', duration = 3000) {
        const { toast, toastMessage } = this.elements;
        if (!toast || !toastMessage) return;

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-hide after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, duration);
    }

    /**
     * Event Handlers
     */
    async handleStartRecording() {
        try {
            // Show loading state
            if (this.elements.recordBtn) {
                this.elements.recordBtn.disabled = true;
                this.elements.recordBtn.textContent = 'Starting...';
            }
            
            await this.sendMessage({ action: 'start' });
            this.updateUI(ActionRecorderPopup.STATUS.RECORDING);
            
            // Show instruction message
            if (this.elements.actionsList) {
                this.elements.actionsList.innerHTML = `
                    <li class="instruction">
                        <div class="action-content">
                            <p class="action-info">${chrome.i18n.getMessage('process_instruction') || 'Please start your web interactions'}</p>
                        </div>
                    </li>
                `;
            }
        } catch (error) {
            console.error('Failed to start recording:', error);
            
            // Show user-friendly error message
            let errorMessage = 'Failed to start recording. ';
            if (error.message.includes('Background script not ready') || 
                error.message.includes('service worker may be inactive')) {
                errorMessage += 'Please reload the extension by going to chrome://extensions/, finding "ActionXS Recorder", and clicking the reload button. Then try again.';
            } else if (error.message.includes('Message timeout')) {
                errorMessage += 'The recording service is taking too long to respond. Please try again in a moment.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            this.showToast(errorMessage, 'error');
        } finally {
            // Reset button state
            if (this.elements.recordBtn) {
                this.elements.recordBtn.disabled = false;
                this.elements.recordBtn.textContent = 'Start Recording';
            }
        }
    }

    async handleStopRecording() {
        try {
            await this.sendMessage({ action: 'stop' });
            await this.loadInitialState();
        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.showToast('Failed to stop recording.', 'error');
        }
    }

    async handlePauseRecording() {
        try {
            const currentStatus = this.elements.pauseBtn?.textContent?.toLowerCase().includes('pause') 
                ? ActionRecorderPopup.STATUS.PAUSED 
                : ActionRecorderPopup.STATUS.RECORDING;
            
            await this.sendMessage({ action: 'pause' });
            this.updateUI(currentStatus === ActionRecorderPopup.STATUS.RECORDING 
                ? ActionRecorderPopup.STATUS.PAUSED 
                : ActionRecorderPopup.STATUS.RECORDING);
        } catch (error) {
            console.error('Failed to pause/resume recording:', error);
            this.showToast('Failed to pause/resume recording.', 'error');
        }
    }

    async handleRestartRecording() {
        try {
            await this.sendMessage({ action: 'restart' });
            await this.loadInitialState();
            this.showToast('Recording restarted');
        } catch (error) {
            console.error('Failed to restart recording:', error);
            this.showToast('Failed to restart recording.', 'error');
        }
    }

    async handleExportActions(event) {
        const button = event?.target;
        if (!button || button.classList.contains('loading')) return;

        try {
            // Show loading state
            button.classList.add('loading');
            button.textContent = 'Exporting...';

            const data = await this.getStorageData([ActionRecorderPopup.STORAGE_KEYS.ACTION_LIST]);
            const actions = data[ActionRecorderPopup.STORAGE_KEYS.ACTION_LIST] || [];
            
            if (actions.length === 0) {
                this.showToast('No actions to export', 'warning');
                return;
            }

            // Copy to clipboard using modern API
            const jsonData = JSON.stringify(actions, null, 2);
            
            try {
                await navigator.clipboard.writeText(jsonData);
                this.showToast(chrome.i18n.getMessage('export_success') || 'Actions exported to clipboard!', 'success');
            } catch (clipboardError) {
                // Fallback to legacy method
                await this.fallbackCopyToClipboard(jsonData);
                this.showToast(chrome.i18n.getMessage('export_success') || 'Actions exported to clipboard!', 'success');
            }

            // Show success state
            button.classList.remove('loading');
            button.classList.add('success');
            button.textContent = 'Exported!';

            // Reset button after delay
            setTimeout(() => {
                button.classList.remove('success');
                const actionCount = this.elements.actionsList?.querySelectorAll('li').length || 0;
                button.textContent = `${chrome.i18n.getMessage('export_actions') || 'Export'} (${actionCount})`;
            }, 2000);

        } catch (error) {
            console.error('Failed to export actions:', error);
            this.showToast('Failed to export actions. Please try again.', 'error');
            
            // Reset button state
            if (button) {
                button.classList.remove('loading', 'success');
                const actionCount = this.elements.actionsList?.querySelectorAll('li').length || 0;
                button.textContent = `${chrome.i18n.getMessage('export_actions') || 'Export'} (${actionCount})`;
            }
        }
    }

    /**
     * Fallback clipboard method for older browsers
     */
    async fallbackCopyToClipboard(text) {
        return new Promise((resolve, reject) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const result = document.execCommand('copy');
                if (result) {
                    resolve();
                } else {
                    reject(new Error('Copy command failed'));
                }
            } catch (error) {
                reject(error);
            } finally {
                document.body.removeChild(textArea);
            }
        });
    }

    handleShowHelp() {
        try {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                chrome.tabs.create({ url: chrome.runtime.getURL('popup/help.html') });
            }
        } catch (error) {
            console.error('Failed to open help:', error);
            this.showToast('Failed to open help page.', 'error');
        }
    }
}

// Initialize the popup when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}

function initializePopup() {
    try {
        new ActionRecorderPopup();
    } catch (error) {
        console.error('Critical error initializing popup:', error);
        showFallbackUI(error);
    }
}

function showFallbackUI(error) {
    try {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="fallback-content">
                    <h3>⚠️ Initialization Error</h3>
                    <p>ActionXS Recorder failed to initialize properly.</p>
                    <p><strong>Error:</strong> ${error.message || 'Unknown error'}</p>
                    <button class="retry-btn" onclick="window.location.reload()">
                        Reload Extension
                    </button>
                    <div style="margin-top: 16px; font-size: 12px; color: #666;">
                        If this problem persists, please reinstall the extension.
                    </div>
                </div>
            `;
        }
    } catch (fallbackError) {
        console.error('Failed to show fallback UI:', fallbackError);
        // Last resort - show alert
        alert('ActionXS Recorder failed to initialize. Please reload the extension.');
    }
}