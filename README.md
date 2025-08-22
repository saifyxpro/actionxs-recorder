<div align="center">

# ActionXS Recorder

[![Chrome Extension](https://img.shields.io/badge/chrome-extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-00D26A?style=for-the-badge)](https://github.com/saifyxpro/actionxs-recorder/releases)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-FF6B35?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

[![GitHub Repo](https://img.shields.io/badge/GitHub-saifyxpro/actionxs--recorder-181717?style=for-the-badge&logo=github)](https://github.com/saifyxpro/actionxs-recorder)
[![Issues](https://img.shields.io/github/issues/saifyxpro/actionxs-recorder?style=for-the-badge)](https://github.com/saifyxpro/actionxs-recorder/issues)
[![Stars](https://img.shields.io/github/stars/saifyxpro/actionxs-recorder?style=for-the-badge&logo=github)](https://github.com/saifyxpro/actionxs-recorder/stargazers)

### 🚀 **Professional Web Automation Recording**

![Website Preview](img/website.png)

**Record web interactions & generate AdsPower RPA workflows automatically**



**ActionXS Recorder** is a cutting-edge Chrome extension that intelligently captures user interactions and converts them into structured AdsPower RPA automation workflows. Built by **Saify** with modern Manifest V3 architecture.

</div>

## ✨ **Key Features**

### 🎯 **Core Recording Engine**
- **🔍 Intelligent Element Detection** - Advanced DOM analysis with precise selector generation
- **⚡ Real-time Action Capture** - Zero-latency recording with microsecond precision
- **🎮 Flexible Control System** - Start, pause, resume, and stop with instant response
- **📊 Live Action Analytics** - Real-time counter and status visualization
- **🔄 One-Click AdsPower Export** - Seamless integration with clipboard functionality


## 📸 Screenshots & Visual Guide

### 🎯 Extension Interface Overview

<div align="center">

| Interface State | Preview | Description |
|----------------|---------|-------------|
| **Main Popup** | ![Extension Popup](img/popup-screenshot.png) | **Modern popup interface** with recording controls, action count, and status indicators |
| **Recording Active** | ![Recording Status](img/recording-status.png) | **Live recording state** with animated red badge and real-time action tracking |
| **Action History** | ![Action List](img/action-list.png) | **Detailed action list** showing captured interactions with timestamps and element info |
| **Export Success** | ![Success Export](img/exported_screenshot.png) | **Export confirmation** with clipboard integration and AdsPower RPA format |
| **Help Center** | ![Help Interface](img/help_doc_screenshot.png) | **Interactive help system** with usage tips and troubleshooting guides |

</div>

### 🧪 **Demo: Record a Google Search (30s)**

**Try this simple workflow to test the extension:**

<div align="center">

| Step | Action | Result |
|------|--------|---------|
| **1** | 🔴 Click extension → "Start Recording" | Red badge appears |
| **2** | 🌐 Navigate to `google.com` | URL captured |
| **3** | 🔍 Click search box → Type "ActionXS" | Input recorded |
| **4** | ⌨️ Press Enter → Click first result | Navigation captured |
| **5** | ⏹️ Click extension → "Stop Recording" | Session ended |
| **6** | 📤 Click "Export to Clipboard" | ✅ Ready for RPA! |

</div>

### 💡 **Pro Recording Tips**

<details>
<summary><strong>🎯 Best Practices for Perfect Recordings</strong></summary>

- **⏱️ Natural Pace** - Don't rush actions, let timing be captured naturally
- **🎯 Clean Clicks** - Avoid overlapping elements during interactions  
- **🧪 Test First** - Start with simple workflows before complex ones
- **🧹 Fresh Start** - Clear previous recordings for clean exports
- **✅ Verify Export** - Test the generated RPA workflow in AdsPower

</details>

<details>
<summary><strong>⚠️ Common Recording Issues & Solutions</strong></summary>

- **🔄 Dynamic Content** → Record slower, wait for content to load
- **🪟 Popup Windows** → Record each popup in separate sessions
- **🖼️ iframe Elements** → Ensure iframe content is fully loaded
- **⚡ Fast Actions** → Slow down slightly for better capture accuracy

</details>

## 🛠️ **Installation**

<div align="center">

### **📦 Two Installation Methods**

| Method | Best For | Time Required |
|--------|----------|---------------|
| **🌐 Chrome Web Store** | **End Users** | ~30 seconds |
| **🔧 Manual Installation** | **Developers** | ~2 minutes |

</div>

### 🌟 **Chrome Web Store (Recommended)**

<details>
<summary><strong>🚀 Quick Install Guide</strong></summary>

1. **Open Chrome Web Store**
   - Visit [Chrome Web Store](https://chrome.google.com/webstore)
   - Or navigate to `chrome://extensions/` → "Open Chrome Web Store"

2. **Find & Install**
   - Search for **"ActionXS Recorder"** by **Saify**
   - Click **"Add to Chrome"** → Confirm permissions
   - ✅ Extension appears in toolbar (pin it for easy access)

</details>

### 🔧 **Manual Installation (Developers)**

<details>
<summary><strong>⚙️ Developer Setup Process</strong></summary>

```
# Clone repository
git clone https://github.com/saifyxpro/actionxs-recorder.git
cd actionxs-recorder

# Or download ZIP and extract to folder
```

**Installation Steps:**
1. **Enable Developer Mode**: `chrome://extensions/` → Toggle "Developer mode"
2. **Load Extension**: Click "Load unpacked" → Select ActionXS folder
3. **Verify**: Extension icon appears in toolbar with no errors

</details>

### 🔧 **System Requirements & Compatibility**

<div align="center">

| Browser | Support Status | Minimum Version | Notes |
|---------|---------------|-----------------|-------|
| ![Chrome](https://img.shields.io/badge/Chrome-✅-4CAF50?logo=google-chrome) | **Full Support** | 88+ | **Recommended** |
| ![Edge](https://img.shields.io/badge/Edge-✅-4CAF50?logo=microsoft-edge) | **Full Support** | 88+ | Chromium-based |
| ![Brave](https://img.shields.io/badge/Brave-✅-4CAF50?logo=brave) | **Full Support** | Latest | Privacy-focused |
| ![Opera](https://img.shields.io/badge/Opera-✅-4CAF50?logo=opera) | **Full Support** | Latest | Chromium-based |
| ![Firefox](https://img.shields.io/badge/Firefox-❌-F44336?logo=firefox) | **Not Supported** | N/A | Manifest V2 only |

</div>

## 🎮 **Usage Guide**

### 🎯 **Extension Controls**

<div align="center">

| Control | Action | Visual Indicator | Purpose |
|---------|--------|-----------------|----------|
| **▶️ Start** | Begin recording | 🔴 Red badge | Start capturing interactions |
| **⏸️ Pause** | Suspend recording | 🟡 Yellow badge | Temporarily pause session |
| **⏹️ Stop** | End recording | ⚪ Default badge | Complete recording session |
| **📤 Export** | Copy to clipboard | ✅ Success toast | Export for AdsPower RPA |
| **🧹 Clear** | Reset session | 🧹 Empty state | Delete all recorded actions |

</div>

## 🏗️ **Technical Architecture**

### 📁 **Project Structure**

```
ActionXS-Recorder/
├── 📋 manifest.json              # Manifest V3 configuration
├── 🌐 _locales/en/messages.json  # Internationalization
├── 🎨 img/                       # Icons and screenshots  
├── ⚙️ libs/                      # Core JavaScript modules
│   ├── background.js             # Service worker (Manifest V3)
│   ├── content.js                # Page interaction monitor
│   └── popup.js                  # UI control logic
└── 🎭 popup/                     # User interface files
    ├── popup.html/.css           # Main interface
    └── help.html/.css/.js        # Help system
```

### 🔧 **Core Technologies**

| Technology | Purpose | Version |
|------------|---------|---------|
| **Manifest V3** | Modern extension standard | Latest |
| **Service Workers** | Background processing | ES2022 |
| **Content Scripts** | DOM interaction monitoring | ES2022 |
| **Chrome APIs** | Storage, tabs, scripting | Latest |

### 🔒 **Required Permissions**

<details>
<summary><strong>🛡️ Security & Privacy Details</strong></summary>

| Permission | Purpose | Privacy Impact |
|------------|---------|----------------|
| `storage` | Save recorded actions locally | ✅ Local only |
| `activeTab` | Monitor current tab interactions | ✅ Current tab only |
| `scripting` | Inject recording functionality | ✅ On-demand only |
| `tabs` | Track navigation events | ✅ Navigation only |

**💪 Privacy Guarantee:**
- ✅ **Local Processing** - All data stays on your device
- ✅ **No Tracking** - Zero analytics or user monitoring
- ✅ **No Cloud Sync** - Data never transmitted externally
- ✅ **Open Source** - Complete code transparency

</details>

## 🤝 **Contributing**

<div align="center">

### **🚀 Join the Development**

[![Contributors Welcome](https://img.shields.io/badge/Contributors-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-High-blue?style=for-the-badge)](#)
[![Tests](https://img.shields.io/badge/Tests-Passing-success?style=for-the-badge)](#)

</div>

### 🛠️ **Development Setup**

```
# Fork & clone the repository
git clone https://github.com/YOUR-USERNAME/actionxs-recorder.git
cd actionxs-recorder

# Create feature branch
git checkout -b feature/amazing-improvement

# Make changes and test thoroughly
# Commit with clear, descriptive messages
git commit -m "feat: add amazing new feature"

# Push and create Pull Request
git push origin feature/amazing-improvement
```

### 📝 **Contribution Guidelines**

<details>
<summary><strong>📋 Code Standards & Review Process</strong></summary>

**Code Quality:**
- ✅ Follow existing code style and patterns
- ✅ Add comments for complex logic
- ✅ Test across multiple websites
- ✅ Ensure Manifest V3 compliance

**Pull Request Process:**
1. **Fork** repository and create feature branch
2. **Develop** following established patterns
3. **Test** thoroughly on various websites  
4. **Document** changes and new features
5. **Submit** PR with clear description

**Review Criteria:**
- Code functionality and performance
- Cross-browser compatibility testing
- Security and privacy compliance
- Documentation completeness

</details>

## 📝 **Changelog**

<div align="center">

### **🚀 Version History**

| Version | Date | Key Features |
|---------|------|--------------|
| **1.0.0** | 2025 | 🎉 Initial release with core recording & AdsPower RPA integration |
| **1.1.0** | *Planned* | 🔄 Multi-tab support & enhanced dynamic content detection |
| **1.2.0** | *Planned* | 📁 File operations & direct AdsPower API integration |

</div>

### **🚀 Latest Release (v1.0.0)**
- ✨ **Smart Recording Engine** - Intelligent element detection and interaction capture
- 🎯 **AdsPower RPA Integration** - Seamless export functionality with structured data
- 🎨 **Modern Interface** - Material Design 3 with real-time status indicators
- 🔒 **Manifest V3** - Enhanced security and performance architecture
- 🌐 **Multi-language Foundation** - Internationalization support structure

### **🗺️ Development Roadmap**
- 🔄 **Enhanced Multi-tab Recording** - Simultaneous recording across multiple tabs
- 📊 **Advanced Analytics** - Detailed action insights and performance metrics  
- 🎛️ **Customizable Filters** - User-defined recording parameters
- 📱 **Mobile Support** - Chrome mobile browser compatibility
- 🎨 **Theme System** - Customizable UI themes and branding

---

## 📄 **License & Legal**

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-♥-red?style=for-the-badge)](#)

**Licensed under the MIT License** - See [LICENSE](LICENSE) file for full details.

*Free to use, modify, and distribute with attribution.*

</div>

---

## 👨‍💻 **Author & Credits**

<div align="center">

### **🚀 Created by Saify**

**Lead Developer & Project Architect**
- 💡 **Project Vision** - Concept and strategic development
- 🏗️ **Technical Architecture** - Chrome Extension & Manifest V3 implementation  
- 🔗 **AdsPower Integration** - RPA workflow compatibility
- 🎨 **User Experience** - Interface design and user journey

[![GitHub](https://img.shields.io/badge/GitHub-saifyxpro-181717?style=for-the-badge&logo=github)](https://github.com/saifyxpro)
[![Email](https://img.shields.io/badge/Contact-hello@saify.me-EA4335?style=for-the-badge&logo=gmail)](mailto:hello@saify.me)

</div>

---

## 🆘 **Support & Resources**

<div align="center">

### **📚 Get Help & Support**

| Resource | Purpose | Link |
|----------|---------|------|
| **📖 User Guide** | Detailed usage instructions | [Help Documentation](popup/help.html) |
| **🐛 Bug Reports** | Report issues and bugs | [GitHub Issues](https://github.com/saifyxpro/actionxs-recorder/issues/new?template=bug_report.md) |
| **💡 Feature Requests** | Suggest improvements | [Feature Request](https://github.com/saifyxpro/actionxs-recorder/issues/new?template=feature_request.md) |
| **💬 Community** | Discussion and Q&A | [GitHub Discussions](https://github.com/saifyxpro/actionxs-recorder/discussions) |
| **📧 Direct Support** | Urgent technical issues | [hello@saify.me](mailto:hello@saify.me) |

</div>

### 🔧 **Common Troubleshooting**

<details>
<summary><strong>❌ Extension Not Recording Actions</strong></summary>

- ✅ **Check Recording Status** - Ensure "Start Recording" was clicked (red badge visible)
- ✅ **Verify Permissions** - Extension needs access to current website
- ✅ **Refresh Page** - Reload page and restart recording session
- ✅ **Check Console** - Look for JavaScript errors that might block functionality

</details>

<details>
<summary><strong>📤 Export Not Working</strong></summary>

- ✅ **Record Actions First** - Must have at least one recorded action
- ✅ **Stop Recording** - Ensure recording session is stopped before export
- ✅ **Check Clipboard** - Verify browser clipboard permissions are enabled
- ✅ **Test Paste** - Try pasting in a text editor to verify export success

</details>

<details>
<summary><strong>⚡ Missing Actions in Export</strong></summary>

- ✅ **Slow Down Actions** - Record at natural pace for better capture
- ✅ **Wait for Loading** - Ensure all dynamic content loads before interaction
- ✅ **Check iframes** - Embedded content may need special handling
- ✅ **Review Console** - JavaScript errors may prevent action capture

</details>

---

## 🔗 **Related Projects & Resources**

<div align="center">

| Project | Purpose | Status |
|---------|---------|--------|
| [**AdsPower RPA**](https://www.adspower.net) | Target automation platform | ✅ **Active Integration** |
| [**Chrome Extensions Docs**](https://developer.chrome.com/docs/extensions/) | Official development guide | 📚 **Reference** |
| [**Manifest V3 Guide**](https://developer.chrome.com/docs/extensions/migrating/) | Latest extension standards | 📋 **Compliance** |

</div>

---

<div align="center">

### **🌟 Built with ❤️ by the Open Source Community**

**ActionXS Recorder** - *Professional Web Automation Recording for AdsPower RPA*

[![GitHub](https://img.shields.io/badge/⭐_Star_on_GitHub-yellow?style=for-the-badge)](https://github.com/saifyxpro/actionxs-recorder)
[![Share](https://img.shields.io/badge/📢_Share_Project-blue?style=for-the-badge)](#)

*Thank you for using ActionXS Recorder! 🚀*

</div>
