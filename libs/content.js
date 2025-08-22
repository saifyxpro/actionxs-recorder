/**
 * ActionXS Recorder - Modern Content Script
 * Tracks user interactions on web pages and communicates with background script
 */

// Prevent multiple injections
if (!window.ActionRecorderContentLoaded) {
    window.ActionRecorderContentLoaded = true;

    class ActionRecorderContent {
        constructor() {
            this.isRecording = false;
            this.lastAction = null;
            this.debounceTimer = null;
            this.eventListeners = new Map();
            this.lastScrollY = 0;
            
            // Initialize the content script
            this.init();
        }
            
        /**
         * Get information about an element for recording
         */
        getElementInfo(element) {
            try {
                // Validate element is a proper DOM element
                if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
                    return { text: '', value: '', placeholder: '', title: '', ariaLabel: '' };
                }
                
                return {
                    text: this.getElementText(element),
                    value: element.value || '',
                    placeholder: element.placeholder || '',
                    title: element.title || '',
                    ariaLabel: (element.getAttribute && element.getAttribute('aria-label')) || ''
                };
            } catch (error) {
                console.error('Error getting element info:', error);
                return { text: '', value: '', placeholder: '', title: '', ariaLabel: '' };
            }
        }

        /**
         * Initialize content script
         */
        init() {
            // Avoid multiple initializations
            if (window.actionRecorderInitialized) {
                return;
            }
            window.actionRecorderInitialized = true;

        this.setupEventListeners();
        this.notifyBackgroundScript('content_script_ready');
        console.log('ActionXS Recorder content script initialized');
    }

    /**
     * Set up event listeners for user interactions
     */
    setupEventListeners() {
        // Click events
        this.addEventListenerWithCleanup('click', (event) => {
            this.handleClick(event);
        }, { passive: false, capture: true });

        // Input events
        this.addEventListenerWithCleanup('input', (event) => {
            this.handleInput(event);
        }, { passive: true });

        // Keyboard events
        this.addEventListenerWithCleanup('keydown', (event) => {
            this.handleKeyboard(event);
        }, { passive: false });

        // Scroll events (debounced)
        this.addEventListenerWithCleanup('scroll', (event) => {
            this.handleScroll(event);
        }, { passive: true });

        // Focus/blur events
        this.addEventListenerWithCleanup('blur', (event) => {
            this.handleBlur(event);
        }, { passive: true, capture: true });

        // Mouse hover events
        this.addEventListenerWithCleanup('mouseenter', (event) => {
            this.handleMouseEnter(event);
        }, { passive: true, capture: true });

        // Form submission
        this.addEventListenerWithCleanup('submit', (event) => {
            this.handleFormSubmit(event);
        }, { passive: false, capture: true });
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListenerWithCleanup(eventType, handler, options) {
        const boundHandler = handler.bind(this);
        document.addEventListener(eventType, boundHandler, options);
        
        // Store for cleanup
        this.eventListeners.set(eventType, { handler: boundHandler, options });
    }

    /**
     * Handle click events
     */
    handleClick(event) {
        try {
            const element = event.target;
            const selector = this.generateSelector(element);
            const elementInfo = this.getElementInfo(element);

            const action = {
                type: 'click',
                config: {
                    selector: selector,
                    tagName: element.tagName.toLowerCase(),
                    text: elementInfo.text,
                    coordinates: {
                        x: event.clientX,
                        y: event.clientY
                    },
                    timestamp: Date.now()
                }
            };

            this.recordAction(action);
        } catch (error) {
            console.error('Error handling click:', error);
        }
    }

    /**
     * Handle input events
     */
    handleInput(event) {
        try {
            const element = event.target;
            if (!this.isInputElement(element)) return;

            const selector = this.generateSelector(element);
            const value = element.value;

            // Don't record sensitive inputs
            if (this.isSensitiveInput(element)) {
                return;
            }

            const action = {
                type: 'inputContent',
                config: {
                    selector: selector,
                    content: value,
                    inputType: element.type || 'text',
                    tagName: element.tagName.toLowerCase(),
                    timestamp: Date.now()
                }
            };

            // Debounce input events to avoid too many records
            this.recordActionDebounced(action, 1000);
        } catch (error) {
            console.error('Error handling input:', error);
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyboard(event) {
        try {
            // Only record special keys
            if (this.isSpecialKey(event.key)) {
                const action = {
                    type: 'keyboard',
                    config: {
                        key: event.key,
                        code: event.code,
                        ctrlKey: event.ctrlKey,
                        altKey: event.altKey,
                        shiftKey: event.shiftKey,
                        metaKey: event.metaKey,
                        timestamp: Date.now()
                    }
                };

                this.recordAction(action);
            }
        } catch (error) {
            console.error('Error handling keyboard:', error);
        }
    }

    /**
     * Handle scroll events
     */
    handleScroll(event) {
        try {
            const scrollData = {
                x: window.pageXOffset || document.documentElement.scrollLeft,
                y: window.pageYOffset || document.documentElement.scrollTop,
                target: event.target === document ? 'window' : this.generateSelector(event.target)
            };

            const action = {
                type: 'scrollPage',
                config: {
                    scrollX: scrollData.x,
                    scrollY: scrollData.y,
                    distance: Math.abs(scrollData.y - (this.lastScrollY || 0)),
                    target: scrollData.target,
                    timestamp: Date.now()
                }
            };

            this.lastScrollY = scrollData.y;
            this.recordActionDebounced(action, 500);
        } catch (error) {
            console.error('Error handling scroll:', error);
        }
    }

    /**
     * Handle blur events (for potential pending actions)
     */
    handleBlur(event) {
        try {
            const element = event.target;
            if (this.isInputElement(element) && element.value) {
                const selector = this.generateSelector(element);
                
                const action = {
                    type: 'inputContent',
                    config: {
                        selector: selector,
                        content: element.value,
                        inputType: element.type || 'text',
                        tagName: element.tagName.toLowerCase(),
                        timestamp: Date.now()
                    }
                };

                // Send as blur content (might be used later)
                this.notifyBackgroundScript('blur', action);
            }
        } catch (error) {
            console.error('Error handling blur:', error);
        }
    }

    /**
     * Handle mouse enter events (hover)
     */
    handleMouseEnter(event) {
        try {
            const element = event.target;
            const elementInfo = this.getElementInfo(element);

            // Only record meaningful hover events
            if (this.isInteractiveElement(element)) {
                const action = {
                    type: 'passingElement',
                    config: {
                        selector: this.generateSelector(element),
                        tagName: element.tagName.toLowerCase(),
                        text: elementInfo.text,
                        timestamp: Date.now()
                    }
                };

                this.recordActionDebounced(action, 2000);
            }
        } catch (error) {
            console.error('Error handling mouse enter:', error);
        }
    }

    /**
     * Handle form submission
     */
    handleFormSubmit(event) {
        try {
            const form = event.target;
            const action = {
                type: 'formSubmit',
                config: {
                    selector: this.generateSelector(form),
                    action: form.action || window.location.href,
                    method: form.method || 'GET',
                    timestamp: Date.now()
                }
            };

            this.recordAction(action);
        } catch (error) {
            console.error('Error handling form submit:', error);
        }
    }

    /**
     * Record action immediately
     */
    recordAction(action) {
        try {
            // Avoid duplicate actions
            if (this.isDuplicateAction(action)) {
                return;
            }

            this.lastAction = action;
            this.notifyBackgroundScript('recorder', action);
        } catch (error) {
            console.error('Error recording action:', error);
        }
    }

    /**
     * Record action with debouncing
     */
    recordActionDebounced(action, delay = 500) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.recordAction(action);
        }, delay);
    }

    /**
     * Generate CSS selector for element
     */
    generateSelector(element) {
        try {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            // Try ID first
            if (element.id) {
                return `#${this.escapeSelector(element.id)}`;
            }

            // Try unique class combination
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.trim().split(/\s+/).filter(cls => cls);
                if (classes.length > 0) {
                    const classSelector = '.' + classes.map(cls => this.escapeSelector(cls)).join('.');
                    if (document.querySelectorAll(classSelector).length === 1) {
                        return classSelector;
                    }
                }
            }

            // Build path-based selector
            const path = [];
            let current = element;

            while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
                let selector = current.tagName.toLowerCase();
                
                // Add index if there are siblings of the same type
                const siblings = Array.from(current.parentNode?.children || [])
                    .filter(sibling => sibling.tagName === current.tagName);
                
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
                
                path.unshift(selector);
                current = current.parentElement;
                
                // Limit path length
                if (path.length > 6) break;
            }

            return path.join(' > ');
        } catch (error) {
            console.error('Error generating selector:', error);
            return element.tagName?.toLowerCase() || 'unknown';
        }
    }

    /**
     * Get element text content safely
     */
    getElementText(element) {
        try {
            if (!element) return '';
            
            // For input elements, use value or placeholder
            if (element.tagName && element.tagName.toLowerCase() === 'input') {
                return element.value || element.placeholder || '';
            }
            
            // For other elements, get text content
            let text = element.textContent || element.innerText || '';
            return text.trim().substring(0, 100); // Limit text length
        } catch (error) {
            console.error('Error getting element text:', error);
            return '';
        }
    }

    /**
     * Check if element is an input element
     */
    isInputElement(element) {
        try {
            if (!element || !element.tagName) return false;
            
            const inputTags = ['input', 'textarea', 'select'];
            const tagName = element.tagName.toLowerCase();
            
            return inputTags.includes(tagName) ||
                   (element.getAttribute && element.getAttribute('contenteditable') === 'true');
        } catch (error) {
            console.error('Error checking input element:', error);
            return false;
        }
    }

    /**
     * Check if input contains sensitive data
     */
    isSensitiveInput(element) {
        try {
            if (!element) return false;
            
            const type = (element.type || '').toLowerCase();
            const name = (element.name || '').toLowerCase();
            const id = (element.id || '').toLowerCase();
            const placeholder = (element.placeholder || '').toLowerCase();
            
            const sensitiveTypes = ['password', 'email'];
            const sensitiveKeywords = ['password', 'pass', 'pwd', 'secret', 'token', 'key', 'credit', 'card', 'cvv', 'ssn'];
            
            // Check type
            if (sensitiveTypes.includes(type)) return true;
            
            // Check attributes for sensitive keywords
            const attributes = [name, id, placeholder].join(' ');
            return sensitiveKeywords.some(keyword => attributes.includes(keyword));
        } catch (error) {
            console.error('Error checking sensitive input:', error);
            return false;
        }
    }

    /**
     * Escape CSS selector special characters
     */
    escapeSelector(str) {
        try {
            // Use CSS.escape if available (modern browsers)
            if (typeof CSS !== 'undefined' && CSS.escape) {
                return CSS.escape(str);
            }
            
            // Fallback for older browsers
            return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
        } catch (error) {
            return str.replace(/[^a-zA-Z0-9_-]/g, '_');
        }
    }

    /**
     * Get meaningful text from element
     */
    getElementText(element) {
        try {
            // Validate element is a proper DOM element
            if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            
            // For input elements, prefer placeholder or aria-label
            if (this.isInputElement(element)) {
                return element.placeholder || (element.getAttribute && element.getAttribute('aria-label')) || '';
            }

            // Get text content, but limit length
            const text = element.textContent?.trim() || '';
            return text.length > 100 ? text.substring(0, 100) + '...' : text;
        } catch (error) {
            return '';
        }
    }

    /**
     * Check if element is an input element
     */
    isInputElement(element) {
        const inputTags = ['input', 'textarea', 'select'];
        return inputTags.includes(element.tagName?.toLowerCase());
    }

    /**
     * Check if input is sensitive (password, etc.)
     */
    isSensitiveInput(element) {
        const sensitiveTypes = ['password', 'hidden'];
        const sensitiveNames = ['password', 'pass', 'pwd', 'secret', 'token', 'key'];
        
        const type = element.type?.toLowerCase();
        const name = element.name?.toLowerCase();
        const id = element.id?.toLowerCase();
        
        return sensitiveTypes.includes(type) || 
               sensitiveNames.some(sensitive => 
                   name?.includes(sensitive) || id?.includes(sensitive)
               );
    }

    /**
     * Check if key is special (non-printable)
     */
    isSpecialKey(key) {
        const specialKeys = [
            'Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Home', 'End', 'PageUp', 'PageDown', 'Delete', 'Backspace',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
        ];
        return specialKeys.includes(key);
    }

    /**
     * Check if element is interactive
     */
    isInteractiveElement(element) {
        try {
            // Validate element is a proper DOM element
            if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
                return false;
            }
            
            const interactiveTags = ['a', 'button', 'input', 'select', 'textarea'];
            const tagName = element.tagName?.toLowerCase();
            
            return interactiveTags.includes(tagName) || 
                   element.onclick || 
                   (element.getAttribute && element.getAttribute('role') === 'button') ||
                   element.style.cursor === 'pointer';
        } catch (error) {
            console.error('Error checking interactive element:', error);
            return false;
        }
    }

    /**
     * Check if action is duplicate
     */
    isDuplicateAction(action) {
        if (!this.lastAction) return false;
        
        // Simple duplicate check based on type and key properties
        if (this.lastAction.type !== action.type) return false;
        
        switch (action.type) {
            case 'click':
                return this.lastAction.config.selector === action.config.selector &&
                       Math.abs(this.lastAction.config.timestamp - action.config.timestamp) < 500;
            
            case 'inputContent':
                return this.lastAction.config.selector === action.config.selector &&
                       this.lastAction.config.content === action.config.content;
            
            case 'scrollPage':
                return Math.abs(this.lastAction.config.scrollY - action.config.scrollY) < 50;
            
            default:
                return false;
        }
    }

    /**
     * Send message to background script
     */
    notifyBackgroundScript(action, content = null) {
        try {
            const message = { action };
            if (content) {
                message.content = content;
            }
            
            // Use chrome.runtime.sendMessage with proper error handling
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.warn('Chrome runtime API not available');
            }
        } catch (error) {
            console.error('Error notifying background script:', error);
        }
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        this.eventListeners.forEach(({ handler, options }, eventType) => {
            document.removeEventListener(eventType, handler, options);
        });
        this.eventListeners.clear();
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}

// Initialize content script
try {
    window.actionRecorderInstance = new ActionRecorderContent();
} catch (error) {
    console.error('Failed to initialize ActionXS Recorder content script:', error);
}

} // End of ActionRecorderContentLoaded check
