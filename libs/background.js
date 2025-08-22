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
            
            // Add RPA-specific actions for main frame navigation
            if (frameId === 0) {
                // Add close other pages action (common in RPA workflows)
                this.updateRecordedActions({
                    type: 'closeOtherPage',
                    config: { timestamp: Date.now() }
                });

                // Add wait time after navigation (important for page loading)
                this.updateRecordedActions({
                    type: 'waitTime',
                    config: {
                        timeout: 5000,
                        timeoutType: 'randomInterval',
                        timeoutMin: 3000,
                        timeoutMax: 8000,
                        remark: "",
                        timestamp: Date.now()
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
     * Convert recorded actions to perfect AdsPower RPA format
     */
    convertToRPAFormat(actions) {
        if (!Array.isArray(actions) || actions.length === 0) {
            return [];
        }

        const rpaActions = [];
        let lastAction = null;
        let lastTimestamp = null;
        let actionCounter = 0;

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const currentTimestamp = action.config?.timestamp || Date.now();
            
            // Calculate time difference for wait actions
            if (lastTimestamp && currentTimestamp > lastTimestamp) {
                const timeDiff = currentTimestamp - lastTimestamp;
                if (timeDiff > 2000) { // Add wait if more than 2 seconds
                    const waitAction = this.generateIntelligentWaitAction(timeDiff, lastAction, action);
                    if (waitAction) {
                        rpaActions.push(waitAction);
                        actionCounter++;
                    }
                }
            }

            // Convert action to perfect AdsPower RPA format
            const rpaAction = this.convertActionToAdsPowerRPA(action, lastAction, actionCounter);
            if (rpaAction) {
                if (Array.isArray(rpaAction)) {
                    rpaActions.push(...rpaAction);
                    actionCounter += rpaAction.length;
                } else {
                    rpaActions.push(rpaAction);
                    actionCounter++;
                }
            }

            lastAction = action;
            lastTimestamp = currentTimestamp;
        }

        // Add final professional wait
        if (rpaActions.length > 0) {
            const finalWait = {
                type: "waitTime",
                config: {
                    timeoutType: "randomInterval",
                    timeout: 5000,
                    timeoutMin: 3000,
                    timeoutMax: 8000,
                    remark: "Final completion wait",
                    executionDelay: 500
                }
            };
            rpaActions.push(finalWait);
        }

        return rpaActions;
    }

    /**
     * Convert single action to perfect AdsPower RPA format
     */
    convertActionToAdsPowerRPA(action, lastAction, actionIndex) {
        if (!action || !action.type) return null;

        const baseConfig = {
            executionIndex: actionIndex,
            timestamp: Date.now(),
            remark: this.generateActionRemark(action)
        };

        switch (action.type) {
            case 'newPage':
                return {
                    type: "newPage",
                    config: {
                        ...baseConfig,
                        timeout: 10000,
                        waitForComplete: true
                    }
                };

            case 'gotoUrl':
                return {
                    config: {
                        timeout: 30000,
                        url: action.config.url,
                        waitForLoad: true,
                        retryOnFail: 2,
                        ...baseConfig
                    },
                    type: "gotoUrl"
                };

            case 'click':
                return this.convertClickToAdsPowerRPA(action, baseConfig);

            case 'inputContent':
                return this.convertInputToAdsPowerRPA(action, baseConfig);

            case 'keyboard':
                return this.convertKeyboardToAdsPowerRPA(action, baseConfig);

            case 'scrollPage':
                return this.convertScrollToAdsPowerRPA(action, lastAction, baseConfig);

            case 'formSubmit':
                return [
                    {
                        type: "keyboard",
                        config: {
                            type: "Enter",
                            ...baseConfig,
                            remark: "Form submission via Enter key"
                        }
                    },
                    {
                        type: "waitTime",
                        config: {
                            timeoutType: "randomInterval",
                            timeout: 8000,
                            timeoutMin: 5000,
                            timeoutMax: 12000,
                            remark: "Wait for form processing"
                        }
                    }
                ];

            case 'closeOtherPage':
                return {
                    type: "closeOtherPage",
                    config: {
                        ...baseConfig,
                        excludeCurrent: true,
                        confirmClose: false
                    }
                };

            default:
                return null;
        }
    }

    /**
     * Convert click action to perfect AdsPower RPA format
     */
    convertClickToAdsPowerRPA(action, baseConfig) {
        const config = action.config || {};
        
        // Determine optimal selector strategy
        let selectorRadio = "CSS";
        let selector = config.selector || "";
        
        // Prefer TEXT selector for better reliability if we have meaningful text
        if (config.text && config.text.trim() && config.text.length < 50) {
            selectorRadio = "TEXT";
            selector = config.text.trim();
        }
        
        // Use ARIA label if available and more specific
        if (config.ariaLabel && config.ariaLabel.trim() && !config.text) {
            selectorRadio = "TEXT";
            selector = config.ariaLabel.trim();
        }

        return {
            config: {
                button: "left",
                selector: selector,
                serial: 1,
                type: "click",
                selectorRadio: selectorRadio,
                selectorType: "selector",
                element: "",
                serialType: "fixedValue",
                serialMin: 1,
                serialMax: 50,
                timeout: 15000,
                waitBeforeClick: 500,
                retryOnFail: 2,
                scrollIntoView: true,
                ...baseConfig
            },
            type: "click"
        };
    }

    /**
     * Convert input action to perfect AdsPower RPA format
     */
    convertInputToAdsPowerRPA(action, baseConfig) {
        const config = action.config || {};
        const content = config.content || config.value || "";

        return {
            config: {
                content: content,
                intervals: this.calculateTypingSpeed(content),
                selector: config.selector || "",
                serial: 1,
                selectorRadio: "CSS",
                serialType: "fixedValue",
                selectorType: "selector",
                element: "",
                serialMin: 1,
                serialMax: 50,
                isRandom: "0",
                isClear: "1", // Clear field before typing
                randomContent: content,
                randomInputNum: {
                    min: 0.5,
                    max: 2.0
                },
                timeout: 20000,
                waitBeforeInput: 300,
                simulateHuman: true,
                ...baseConfig
            },
            type: "inputContent"
        };
    }

    /**
     * Convert keyboard action to perfect AdsPower RPA format
     */
    convertKeyboardToAdsPowerRPA(action, baseConfig) {
        const config = action.config || {};
        const keyType = config.key || config.type || "Enter";
        
        return {
            type: "keyboard",
            config: {
                type: keyType,
                delay: 100,
                waitAfter: 500,
                ...baseConfig,
                remark: `Keyboard input: ${keyType}`
            }
        };
    }

    /**
     * Convert scroll action to perfect AdsPower RPA format
     */
    convertScrollToAdsPowerRPA(action, lastAction, baseConfig) {
        const config = action.config || {};
        let distance = config.distance || 300;
        
        // Use actual scroll position for more accuracy
        if (config.scrollY !== undefined) {
            distance = config.scrollY;
        }

        // Ensure minimum meaningful scroll distance
        if (distance < 100) distance = 300;

        return {
            config: {
                distance: Math.round(distance),
                scrollType: "pixel",
                type: "smooth",
                rangeType: "window",
                selectorRadio: "CSS",
                selector: "",
                serial: 1,
                position: "bottom",
                timeout: 10000,
                waitAfterScroll: 1000,
                randomWheelDistance: [100, 200],
                randomWheelSleepTime: [800, 1500],
                scrollSpeed: "medium",
                ...baseConfig
            },
            type: "scrollPage"
        };
    }

    /**
     * Generate intelligent wait actions based on context
     */
    generateIntelligentWaitAction(timeDiff, lastAction, nextAction) {
        // Convert milliseconds to reasonable wait times
        let baseTimeout = Math.min(Math.max(timeDiff, 1000), 30000);
        
        // Context-aware timeout adjustments
        if (lastAction?.type === 'gotoUrl' || lastAction?.type === 'newPage') {
            baseTimeout = Math.max(baseTimeout, 5000); // Longer wait after navigation
        }
        
        if (lastAction?.type === 'click' && nextAction?.type === 'inputContent') {
            baseTimeout = Math.max(baseTimeout, 2000); // Wait for focus
        }
        
        if (lastAction?.type === 'scrollPage') {
            baseTimeout = Math.max(baseTimeout, 1500); // Wait for scroll completion
        }

        // Determine wait type based on timeout duration
        const useRandomInterval = baseTimeout > 3000;
        
        if (useRandomInterval) {
            const minTime = Math.floor(baseTimeout * 0.7);
            const maxTime = Math.floor(baseTimeout * 1.4);
            
            return {
                type: "waitTime",
                config: {
                    timeoutType: "randomInterval",
                    timeout: baseTimeout,
                    timeoutMin: minTime,
                    timeoutMax: maxTime,
                    remark: this.generateWaitRemark(lastAction, nextAction),
                    humanLike: true
                }
            };
        } else {
            return {
                config: {
                    timeout: baseTimeout,
                    timeoutMax: baseTimeout + 1000,
                    timeoutMin: Math.max(baseTimeout - 500, 500),
                    timeoutType: "fixedValue",
                    remark: this.generateWaitRemark(lastAction, nextAction),
                    precision: "high"
                },
                type: "waitTime"
            };
        }
    }

    /**
     * Calculate optimal typing speed based on content
     */
    calculateTypingSpeed(content) {
        if (!content) return 200;
        
        const length = content.length;
        
        // Shorter content = faster typing
        if (length < 10) return 150;
        if (length < 30) return 200;
        if (length < 100) return 300;
        
        // Longer content = more varied speed
        return 400;
    }

    /**
     * Generate descriptive remarks for actions
     */
    generateActionRemark(action) {
        const remarks = {
            'newPage': 'Open new browser tab',
            'gotoUrl': `Navigate to ${action.config?.url || 'URL'}`,
            'click': `Click on ${action.config?.text || action.config?.selector || 'element'}`,
            'inputContent': `Type "${action.config?.content || 'text'}"`,
            'keyboard': `Press ${action.config?.key || action.config?.type || 'key'}`,
            'scrollPage': `Scroll ${action.config?.distance || 300}px down`,
            'waitTime': 'Wait for page/element loading',
            'closeOtherPage': 'Close other browser tabs',
            'formSubmit': 'Submit form data'
        };
        
        return remarks[action.type] || `Execute ${action.type}`;
    }

    /**
     * Generate contextual wait remarks
     */
    generateWaitRemark(lastAction, nextAction) {
        if (lastAction?.type === 'gotoUrl') return 'Wait for page loading';
        if (lastAction?.type === 'click' && nextAction?.type === 'inputContent') return 'Wait for element focus';
        if (lastAction?.type === 'scrollPage') return 'Wait for scroll completion';
        if (lastAction?.type === 'inputContent') return 'Wait for input processing';
        if (lastAction?.type === 'keyboard') return 'Wait for action response';
        
        return 'Natural human-like pause';
    }

    /**
     * Add smart wait times between actions
     */
    addSmartWaitTimes(rpaActions) {
        const actionsWithWaits = [];
        
        for (let i = 0; i < rpaActions.length; i++) {
            const action = rpaActions[i];
            actionsWithWaits.push(action);
            
            // Add wait after certain actions
            const nextAction = rpaActions[i + 1];
            if (nextAction && this.shouldAddWaitAfter(action, nextAction)) {
                const waitAction = this.generateSmartWaitAction(action, nextAction);
                if (waitAction) actionsWithWaits.push(waitAction);
            }
        }
        
        return actionsWithWaits;
    }

    /**
     * Determine if wait should be added after action
     */
    shouldAddWaitAfter(currentAction, nextAction) {
        if (!currentAction || !nextAction) return false;
        
        // Add wait after navigation
        if (currentAction.type === 'gotoUrl') return true;
        
        // Add wait after form submission
        if (currentAction.type === 'keyboard' && currentAction.config?.type === 'Enter') return true;
        
        // Add wait after clicks on navigation elements
        if (currentAction.type === 'click' && 
            (currentAction.config?.selector?.includes('a[') || 
             currentAction.config?.selector?.includes('button'))) return true;
        
        // Add wait between different action types
        if (currentAction.type !== nextAction.type) return true;
        
        return false;
    }

    /**
     * Generate smart wait action based on context
     */
    generateSmartWaitAction(currentAction, nextAction) {
        let baseTimeout = 3000; // Default 3 seconds
        
        // Longer wait for navigation
        if (currentAction.type === 'gotoUrl' || 
            (currentAction.type === 'click' && currentAction.config?.selector?.includes('a['))) {
            baseTimeout = 8000;
        }
        
        // Medium wait for form interactions
        if (currentAction.type === 'inputContent' || 
            (currentAction.type === 'keyboard' && currentAction.config?.type === 'Enter')) {
            baseTimeout = 5000;
        }
        
        // Short wait for UI interactions
        if (currentAction.type === 'click') {
            baseTimeout = 2000;
        }

        return {
            type: "waitTime",
            config: {
                timeoutType: "randomInterval",
                timeout: baseTimeout,
                timeoutMin: Math.floor(baseTimeout * 0.8),
                timeoutMax: Math.floor(baseTimeout * 1.5),
                remark: ""
            }
        };
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
                            const rpaActions = this.convertToRPAFormat(actions);
                            const finalActions = this.addSmartWaitTimes(rpaActions);
                            sendResponse({ success: true, actions: finalActions });
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