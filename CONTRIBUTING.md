# Contributing to ActionXS Recorder

First off, thank you for considering contributing to ActionXS Recorder! It's people like you that make this Chrome extension a great tool for web automation and RPA workflows.

## 🤝 Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- **Be respectful** and inclusive of all contributors
- **Be constructive** in feedback and discussions  
- **Focus on the issue**, not the person
- **Help others learn** and grow in their contributions
- **Follow project guidelines** and maintain code quality

## 🚀 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that someone has already reported the same problem.

**When submitting a bug report, please include:**

- **Clear and descriptive title**
- **Exact steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Chrome version** and operating system
- **Extension version** (found in `manifest.json`)
- **Console logs** if available (press F12 → Console)
- **Screenshots or recordings** when helpful

**Bug Report Template:**
```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior  
What actually happened

## Environment
- Chrome Version: 
- OS: 
- Extension Version: 

## Additional Context
Any other information about the problem
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed enhancement
- **Explain why this enhancement would be useful**
- **Include mockups or examples** if applicable

### Code Contributions

#### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/saifyxpro/actionxs-recorder.git
   cd actionxs-recorder
   ```

2. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Coding Standards

**JavaScript Style Guide:**

- **ES6+ Features** - Use modern JavaScript syntax
- **Async/Await** - Prefer over Promises and callbacks
- **Const/Let** - Never use `var`
- **Arrow Functions** - Use for short functions and callbacks
- **Template Literals** - Use for string interpolation
- **Destructuring** - Use for object and array extraction

**Code Formatting:**
- **Indentation**: 4 spaces (no tabs)
- **Line Length**: 100 characters maximum
- **Semicolons**: Always include
- **Quotes**: Single quotes for strings, backticks for templates
- **Trailing Commas**: Include in multi-line structures

**Example Code Style:**
```javascript
/**
 * Handle user click events with proper error handling
 * @param {Event} event - The click event object
 * @param {Element} element - The target element
 */
async function handleClickEvent(event, element) {
    try {
        const elementInfo = {
            tagName: element.tagName.toLowerCase(),
            text: element.textContent.trim(),
            classList: Array.from(element.classList)
        };
        
        await this.recordAction('click', elementInfo);
    } catch (error) {
        console.error('Error handling click event:', error);
        this.showErrorNotification('Failed to record click action');
    }
}
```

**File Organization:**
- **Modular Design** - Break large files into smaller, focused modules
- **Clear Naming** - Use descriptive file and function names  
- **Consistent Structure** - Follow existing project patterns
- **Documentation** - Include JSDoc comments for all functions

#### Chrome Extension Guidelines

**Manifest V3 Compliance:**
- Use `service_worker` instead of background pages
- Implement proper `host_permissions` instead of broad permissions
- Use `chrome.action` API instead of `chrome.browserAction`
- Handle service worker lifecycle properly

**Security Best Practices:**
- Validate all user inputs
- Use Content Security Policy (CSP)
- Minimize permissions requested
- Sanitize data before storage
- Avoid `eval()` and `innerHTML`

**Performance Considerations:**
- Lazy load resources when possible
- Debounce frequent events (scrolling, typing)
- Clean up event listeners properly
- Optimize DOM queries with caching
- Use efficient data structures

#### Testing Requirements

**Before submitting a pull request:**

1. **Manual Testing**
   - Test on multiple websites (simple and complex)
   - Verify all recording features work correctly
   - Test export functionality with AdsPower RPA
   - Check UI responsiveness and accessibility

2. **Browser Testing**
   - Chrome latest stable version
   - Chrome beta (when available)
   - Chromium-based browsers (Edge, Brave)

3. **Cross-Platform Testing**
   - Windows 10/11
   - macOS (latest versions)
   - Linux (Ubuntu/Chrome OS)

**Test Scenarios:**
```javascript
// Example test cases to verify
const testScenarios = [
    'Record simple form filling and submission',
    'Record navigation between multiple pages', 
    'Record complex JavaScript interactions',
    'Pause and resume recording functionality',
    'Export data format compatibility',
    'Error handling with invalid elements',
    'Memory usage during long recording sessions'
];
```

## 📝 Pull Request Process

### Before Submitting

1. **Update documentation** - Modify README.md if needed
2. **Add changelog entry** - Document your changes
3. **Test thoroughly** - Ensure no regressions
4. **Follow commit message format** (see below)

### Commit Message Format

Use conventional commits for clear history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `style`: Code style changes (no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(recording): add keyboard shortcut support

Add Ctrl+Shift+R shortcut to start/stop recording
- Implement global keyboard listener
- Add keyboard event handling in content script
- Update help documentation

Closes #123

fix(export): handle special characters in element text

Escape special characters when generating RPA export format
- Fix JSON encoding issues
- Add unit tests for edge cases  
- Improve error messaging

Fixes #456
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Cross-browser testing
- [ ] No regressions identified
- [ ] New functionality works as expected

## Screenshots
Include screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Tested with AdsPower RPA integration
```

## 🔧 Development Workflow

### Branching Strategy

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/`** - New features (`feature/keyboard-shortcuts`)
- **`fix/`** - Bug fixes (`fix/export-encoding-issue`)
- **`docs/`** - Documentation updates (`docs/api-reference`)

### Release Process

1. **Feature Development** → `feature/` branches
2. **Integration Testing** → `develop` branch  
3. **Release Preparation** → `release/` branch
4. **Production Deployment** → `main` branch
5. **Hotfixes** → `hotfix/` branches

## 📖 Documentation

### Code Documentation

**Required Documentation:**
- JSDoc comments for all public functions
- README updates for new features
- Inline comments for complex logic
- API documentation for integrations

**Documentation Standards:**
```javascript
/**
 * Records user interaction and stores it in the action list
 * 
 * @param {string} actionType - Type of action (click, input, scroll, etc.)
 * @param {Object} elementInfo - Information about the target element
 * @param {string} elementInfo.selector - CSS selector for the element
 * @param {string} elementInfo.text - Visible text content
 * @param {Object} additionalData - Any additional action-specific data
 * @returns {Promise<boolean>} Success status of the recording operation
 * 
 * @example
 * await recorder.recordAction('click', {
 *     selector: '#submit-button',
 *     text: 'Submit Form'
 * }, { timestamp: Date.now() });
 */
async function recordAction(actionType, elementInfo, additionalData = {}) {
    // Implementation
}
```

### User Documentation

- Update help.html for new features
- Add usage examples in README
- Include screenshots for visual changes
- Maintain FAQ section for common issues

## 🐛 Debugging Guide

### Common Issues

**Service Worker Debugging:**
- Open `chrome://extensions/`
- Click "Inspect views: service worker"
- Check console for background script errors

**Content Script Debugging:**  
- Press F12 on target webpage
- Check console for content script errors
- Use breakpoints in Sources tab

**Storage Debugging:**
- Use `chrome.storage.local.get()` in console
- Check Application tab → Storage → Extension storage
- Clear storage with `chrome.storage.local.clear()`

### Performance Profiling

```javascript
// Example performance monitoring
console.time('action-recording');
await recordAction(actionType, elementInfo);
console.timeEnd('action-recording');

// Memory usage tracking
console.log('Memory usage:', performance.memory.usedJSHeapSize);
```

## 📞 Getting Help

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas  
- **Email** - hello@saify.me for urgent issues
- **Documentation** - Check existing docs before asking

### Response Times

- **Bug Reports** - Within 48 hours
- **Feature Requests** - Within 1 week
- **Pull Request Reviews** - Within 72 hours
- **Security Issues** - Within 24 hours

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special mention for major features or fixes

## 📄 License

By contributing to ActionXS Recorder, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

**Thank you for contributing to ActionXS Recorder! Your efforts help make web automation more accessible to everyone.**

---

## 🐛 Report Issues | 💡 Request Features

<div align="center">

**Found a bug or have an idea for improvement?**

[![Report Bug](https://img.shields.io/badge/🐛_Report_Bug-red?style=for-the-badge)](https://github.com/saifyxpro/actionxs-recorder/issues/new?template=bug_report.md)
[![Request Feature](https://img.shields.io/badge/💡_Request_Feature-blue?style=for-the-badge)](https://github.com/saifyxpro/actionxs-recorder/issues/new?template=feature_request.md)
[![Join Discussion](https://img.shields.io/badge/💬_Join_Discussion-green?style=for-the-badge)](https://github.com/saifyxpro/actionxs-recorder/discussions)

</div>

*This document is a living guide - please suggest improvements through GitHub issues.*
