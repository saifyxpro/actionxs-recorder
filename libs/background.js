/**
 * ActionXS Recorder - Modern Background Service Worker
 * Handles recording logic and browser interactions using Manifest V3 APIs
 */

class ActionRecorderService {
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

    // Badge colors for different states
    static BADGE_COLORS = {
        [ActionRecorderService.STATUS.RECORDING]: '#ea4335',
        [ActionRecorderService.STATUS.WAITING]: '#fbbc04',
        [ActionRecorderService.STATUS.PAUSED]: '#ea4335',
        [ActionRecorderService.STATUS.COMPLETED]: '#34a853'
    };

    constructor() {
        this.recordingStatus = '';
        this.recordedActions = [];
        this.navigationHandler = null;
        this.beforeNavigationHandler = null;
        this.waitTimer = null;
        this.isPaused = false;
        this.pendingBlurContent = null;
        this.isReady = false;
        
        this.init();
    }

    /**
     * Initialize the service worker
     */
    async init() {
        try {
            console.log('ActionXS Recorder: Starting service worker initialization...');
            await this.cleanup();
            this.setupMessageListener();
            
            // Mark service worker as ready
            this.isReady = true;
            console.log('ActionXS Recorder: Service worker initialized successfully');
        } catch (error) {
            console.error('ActionXS Recorder: Failed to initialize service worker:', error);
            this.isReady = false;
            // Still try to set up message listener for basic functionality
            try {
                this.setupMessageListener();
                console.log('ActionXS Recorder: Message listener set up in fallback mode');
            } catch (listenerError) {
                console.error('ActionXS Recorder: Failed to set up message listener:', listenerError);
            }
        }
    }

    /**
     * Check if service worker is ready
     */
    checkReadyState() {
        if (!this.isReady) {
            throw new Error('Background script not ready. Please reload the extension and try again.');
        }
    }

    /**
     * Clean up recording data and reset state
     */
    async cleanup() {
        this.recordedActions = [];
        this.recordingStatus = '';
        this.isPaused = false;
        this.pendingBlurContent = null;
        
        // Clear badge
        await this.setBadgeText('');
        
        // Remove storage data
        return new Promise((resolve) => {
            chrome.storage.local.remove(
                [ActionRecorderService.STORAGE_KEYS.ACTION_LIST, ActionRecorderService.STORAGE_KEYS.RECORDER_STATUS], 
                resolve
            );
        });
    }

    /**
     * Start recording session
     */
    async startRecording() {
        try {
            await this.cleanup();
            
            // Set up event handlers
            this.navigationHandler = this.handleNavigation.bind(this);
            this.beforeNavigationHandler = this.handleWaitState.bind(this);
            
            // Update status
            await this.updateStatus(ActionRecorderService.STATUS.RECORDING);
            
            // Add initial actions
            this.recordedActions.push({ type: 'newPage', config: {} });
            
            const currentUrl = await this.getCurrentTabUrl();
            if (currentUrl) {
                this.recordedActions.push({
                    type: 'gotoUrl',
                    config: { url: currentUrl, timeout: 30000 }
                });
            }
            
            // Inject content script
            await this.injectContentScript();
            
            // Save initial actions
            await this.saveActions();
            
            // Set up listeners (message listener is already set up in init)
            chrome.webNavigation.onCompleted.addListener(this.navigationHandler);
            chrome.webNavigation.onBeforeNavigate.addListener(this.beforeNavigationHandler);
            
            console.log('Recording started successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    /**
     * Stop recording session
     */
    async stopRecording() {
        try {
            // Remove listeners
            if (this.navigationHandler) {
                chrome.webNavigation.onCompleted.removeListener(this.navigationHandler);
            }
            if (this.beforeNavigationHandler) {
                chrome.webNavigation.onBeforeNavigate.removeListener(this.beforeNavigationHandler);
            }
            
            // Clear timer
            if (this.waitTimer) {
                clearTimeout(this.waitTimer);
                this.waitTimer = null;
            }
            
            // Update status
            await this.updateStatus(ActionRecorderService.STATUS.COMPLETED);
            
            console.log('Recording stopped successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to stop recording:', error);
            return false;
        }
    }

    /**
     * Handle messages from content script and popup
     */
    handleMessage(message, sender, sendResponse) {
        try {
            const { action } = message;
            
            switch (action) {
                case 'pause':
                    this.isPaused = !this.isPaused;
                    const newStatus = this.isPaused 
                        ? ActionRecorderService.STATUS.PAUSED 
                        : ActionRecorderService.STATUS.RECORDING;
                    this.updateStatus(newStatus);
                    sendResponse({ success: true });
                    break;
                    
                case 'blur':
                    // Store blur content for potential use
                    this.pendingBlurContent = message.content;
                    sendResponse({ success: true });
                    break;
                    
                case 'recorder':
                    if (message.content && !this.isPaused) {
                        this.pendingBlurContent = null;
                        this.updateRecordedActions(message.content);
                    }
                    sendResponse({ success: true });
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Keep message channel open for async response
    }

    /**
     * Update recorded actions with new action
     */
    async updateRecordedActions(newAction) {
        if (this.isPaused || !newAction) return;

        try {
            // Check if action is different from last action
            const lastAction = this.recordedActions[this.recordedActions.length - 1];
            if (lastAction && JSON.stringify(lastAction) === JSON.stringify(newAction)) {
                return; // Skip duplicate actions
            }

            this.recordedActions.push(newAction);
            
            // Debounce saving to avoid too frequent updates
            if (this.waitTimer) {
                clearTimeout(this.waitTimer);
            }
            
            this.waitTimer = setTimeout(async () => {
                await this.saveActions();
            }, 500);
            
        } catch (error) {
            console.error('Error updating recorded actions:', error);
        }
    }

    /**
     * Handle navigation wait state
     */
    handleWaitState() {
        try {
            // If there's pending blur content, record it
            if (this.pendingBlurContent && !this.isPaused) {
                this.updateRecordedActions(this.pendingBlurContent);
                this.pendingBlurContent = null;
            }
            
            this.updateStatus(ActionRecorderService.STATUS.WAITING);
        } catch (error) {
            console.error('Error handling wait state:', error);
        }
    }

    /**
     * Get current active tab URL
     */
    async getCurrentTabUrl() {
        try {
            return new Promise((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    resolve(tabs[0]?.url || null);
                });
            });
        } catch (error) {
            console.error('Error getting current tab URL:', error);
            return null;
        }
    }

    /**
     * Update recording status
     */
    async updateStatus(status) {
        try {
            this.recordingStatus = status;
            
            // Update badge
            const color = ActionRecorderService.BADGE_COLORS[status] || '#5f6368';
            await this.setBadgeBackgroundColor(color);
            
            const badgeText = status === ActionRecorderService.STATUS.PAUSED ? '⏸' : status;
            await this.setBadgeText(badgeText);
            
            // Save to storage
            await this.setStorageData(ActionRecorderService.STORAGE_KEYS.RECORDER_STATUS, status);
            
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    /**
     * Inject content script into active tab
     */
    async injectContentScript() {
        try {
            const tabs = await this.getActiveTabs();
            if (tabs.length === 0) {
                console.warn('No active tabs found for content script injection');
                return;
            }

            const tabId = tabs[0].id;
            const tabUrl = tabs[0].url;
            
            // Skip injection for chrome:// and other restricted URLs
            if (tabUrl.startsWith('chrome://') || 
                tabUrl.startsWith('chrome-extension://') || 
                tabUrl.startsWith('edge://') || 
                tabUrl.startsWith('about:') ||
                tabUrl.startsWith('moz-extension://')) {
                console.warn(`Cannot inject content script into restricted URL: ${tabUrl}`);
                return;
            }
            
            // Use chrome.scripting API for Manifest V3
            if (chrome.scripting && chrome.scripting.executeScript) {
                await chrome.scripting.executeScript({
                    target: { tabId, allFrames: true },
                    files: ['libs/content.js']
                });
                console.log(`Content script injected successfully into tab ${tabId}`);
            } else {
                console.warn('chrome.scripting API not available');
            }
        } catch (error) {
            console.error('Error injecting content script:', error);
            // Don't throw - this is not a fatal error
        }
    }

    /**
     * Get active tabs
     */
    async getActiveTabs() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
    }

    /**
     * Handle navigation completion
     */
    async handleNavigation({ frameId, tabId }) {
        try {
            console.debug(`Navigation completed - frameId: ${frameId}, tabId: ${tabId}`);
            
            // Re-inject content script
            await this.injectContentScript();
            
            // Update status back to recording
            await this.updateStatus(ActionRecorderService.STATUS.RECORDING);
            
            // Add wait time for main frame navigation
            if (frameId === 0) {
                this.updateRecordedActions({
                    type: 'waitTime',
                    config: {
                        timeout: 5000,
                        timeoutType: 'randomInterval',
                        timeoutMin: 1000,
                        timeoutMax: 10000
                    }
                });
            }
        } catch (error) {
            console.error('Error handling navigation:', error);
        }
    }

    /**
     * Save recorded actions to storage
     */
    async saveActions() {
        try {
            await this.setStorageData(ActionRecorderService.STORAGE_KEYS.ACTION_LIST, this.recordedActions);
        } catch (error) {
            console.error('Error saving actions:', error);
        }
    }

    /**
     * Utility methods for Chrome APIs
     */
    async setBadgeText(text) {
        return new Promise((resolve) => {
            if (chrome.action) {
                chrome.action.setBadgeText({ text }, resolve);
            } else if (chrome.browserAction) {
                chrome.browserAction.setBadgeText({ text }, resolve);
            } else {
                resolve();
            }
        });
    }

    async setBadgeBackgroundColor(color) {
        return new Promise((resolve) => {
            if (chrome.action) {
                chrome.action.setBadgeBackgroundColor({ color }, resolve);
            } else if (chrome.browserAction) {
                chrome.browserAction.setBadgeBackgroundColor({ color }, resolve);
            } else {
                resolve();
            }
        });
    }

    async setStorageData(key, value) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
        });
    }

    async getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        this.isPaused = true;
        this.updateStatus(ActionRecorderService.STATUS.PAUSED);
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        this.isPaused = false;
        this.updateStatus(ActionRecorderService.STATUS.RECORDING);
    }

    /**
     * Get current recording status
     */
    async getStatus() {
        try {
            const data = await chrome.storage.local.get([ActionRecorderService.STORAGE_KEYS.RECORDER_STATUS]);
            return data[ActionRecorderService.STORAGE_KEYS.RECORDER_STATUS] || '';
        } catch (error) {
            console.error('Error getting status:', error);
            return '';
        }
    }

    /**
     * Get recorded actions for export
     */
    async getRecordedActions() {
        try {
            const data = await chrome.storage.local.get([ActionRecorderService.STORAGE_KEYS.ACTION_LIST]);
            return data[ActionRecorderService.STORAGE_KEYS.ACTION_LIST] || [];
        } catch (error) {
            console.error('Error getting recorded actions:', error);
            return [];
        }
    }

    /**
     * Set up main message listener for popup and content script communications
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Ensure response is sent asynchronously
            (async () => {
                try {
                    const { action } = message;
                    
                    // Always respond to getStatus to allow service worker wake-up
                    if (action === 'getStatus') {
                        try {
                            console.log('Service worker: Handling getStatus request');
                            const status = await this.getStatus();
                            const response = { success: true, status: status, isReady: this.isReady };
                            console.log('Service worker: Sending getStatus response:', response);
                            sendResponse(response);
                        } catch (error) {
                            console.warn('Service worker: Error in getStatus:', error);
                            sendResponse({ success: true, status: '', isReady: false });
                        }
                        return;
                    }

                    // Check if service worker is ready for other actions
                    if (action !== 'content_script_ready') {
                        this.checkReadyState();
                    }
                    
                    switch (action) {
                        case 'start':
                            const startResult = await this.startRecording();
                            sendResponse({ success: startResult });
                            break;
                            
                        case 'stop':
                            const stopResult = await this.stopRecording();
                            sendResponse({ success: stopResult });
                            break;
                            
                        case 'restart':
                            await this.cleanup();
                            sendResponse({ success: true });
                            break;
                            
                        case 'pause':
                            this.isPaused = !this.isPaused;
                            const newStatus = this.isPaused 
                                ? ActionRecorderService.STATUS.PAUSED 
                                : ActionRecorderService.STATUS.RECORDING;
                            await this.updateStatus(newStatus);
                            sendResponse({ success: true });
                            break;
                            
                        case 'resume':
                            this.resumeRecording();
                            sendResponse({ success: true });
                            break;
                            
                        case 'export':
                            const actions = await this.getRecordedActions();
                            sendResponse({ success: true, actions: actions });
                            break;
                            
                        case 'getStatus':
                            const status = await this.getStatus();
                            sendResponse({ success: true, status: status });
                            break;
                            
                        case 'blur':
                            // Store blur content for potential use
                            this.pendingBlurContent = message.content;
                            sendResponse({ success: true });
                            break;
                            
                        case 'recorder':
                            if (message.content && !this.isPaused) {
                                this.pendingBlurContent = null;
                                await this.updateRecordedActions(message.content);
                            }
                            sendResponse({ success: true });
                            break;
                            
                        case 'content_script_ready':
                            sendResponse({ success: true });
                            break;
                            
                        default:
                            sendResponse({ success: false, error: 'Unknown action' });
                            break;
                    }
                } catch (error) {
                    console.error('Error in message listener:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            
            // Return true to indicate we'll send a response asynchronously
            return true;
        });
    }
}

// Initialize the service when the service worker starts
let actionRecorderService = null;
let keepAliveInterval = null;

// Service worker install event
chrome.runtime.onInstalled.addListener((details) => {
    console.log('ActionXS Recorder service worker installed:', details.reason);
    initializeService();
});

// Service worker startup event
chrome.runtime.onStartup.addListener(() => {
    console.log('ActionXS Recorder service worker started');
    initializeService();
});

// Keep service worker alive
function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    
    keepAliveInterval = setInterval(() => {
        // Simple operation to keep service worker active
        chrome.storage.local.get(['keepAlive'], () => {
            // This callback keeps the service worker from being terminated
        });
    }, 25000); // Every 25 seconds (Chrome allows 30 seconds of inactivity)
}

// Initialize service if it's not already initialized
function initializeService() {
    if (!actionRecorderService) {
        actionRecorderService = new ActionRecorderService();
        startKeepAlive();
        console.log('ActionXS Recorder service initialized with keepalive');
    }
}

// Initialize immediately when script loads
initializeService();