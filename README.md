# 🛡️ Code Armour - AI Code Review Extension

**Your AI-powered coding companion that provides armour to your coding army!**

Code Armour is an intelligent code review extension that analyzes your code in real-time, detects bugs, fixes security vulnerabilities, and suggests optimizations - just like having GitHub Copilot for code reviews!

Built by **Shrey Goel** 🚀

---

## ✨ Features

### 🔍 **Smart Code Analysis**
- **Review Current File** - Deep analysis of your active code file
- **Review Entire Workspace** - Scan and fix your complete project
- **Real-Time Review** - Live error detection as you type with instant suggestions

### 🛡️ **Security & Bug Detection**
- 🔴 **Security Vulnerabilities** - Detects hardcoded API keys, XSS risks, SQL injection
- 🟡 **Bug Detection** - Finds null pointers, type mismatches, logic errors
- 💚 **Code Quality** - Enforces best practices and clean code standards

### 🌐 **Multi-Language Support**
Supports JavaScript, TypeScript, HTML, CSS, Python, Java, C++, Go, Rust, PHP, Ruby, Swift, Kotlin, and more!

### 🎯 **Additional Features**
- **Flow Structure Visualization** - Explains your optimized code flow step-by-step
- **Motivational Feedback** - Encourages you to keep coding and improving
- **Hinglish Comments** - Adds easy-to-understand code comments in Hinglish

---

## 🚀 Getting Started

### Installation
1. Install Code Armour from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=shrey-goel.code-armour)
2. Reload VSCode

### Setup API Key
1. When you first activate Code Armour, a notification will appear
2. Click **"Set API Key"** button
3. Get your **FREE** Google GenAI API key from: https://aistudio.google.com/apikey
4. Paste your API key and press Enter
5. Done! Code Armour is ready to protect your code! 🎉

---

## 📖 How to Use

### Method 1: Using Notifications (Easiest!)

After setting up your API key, Code Armour shows a persistent notification with quick actions:
```
✅ Code Armour is ready! Choose an action:
[Review Current File] [Review Workspace] [Toggle Real-Time] [Change API Key]
```

Simply click any button to:
- **Review Current File** - Analyze the file you're currently working on
- **Review Workspace** - Scan your entire project folder
- **Toggle Real-Time Review** - Enable/disable live error detection
- **Change API Key** - Update your API key anytime

### Method 2: Using Command Palette

**Windows/Linux:** `Ctrl+Shift+P`  
**Mac:** `Cmd+Shift+P`

Then type any of these commands:
- `🛡️ Code Armour: Review Current File`
- `🛡️ Code Armour: Review Entire Workspace`
- `⚡ Code Armour: Toggle Real-time Review`
- `🔑 Code Armour: Set API Key`

### Method 3: Keyboard Shortcut

**Windows/Linux:** `Ctrl+Shift+R`  
**Mac:** `Cmd+Shift+R`

Instantly reviews your current file!

---

## 🎨 What You'll See

### Real-Time Review (While Typing)
- 🔴 **Red squiggly lines** - Critical errors (security risks, syntax errors)
- 🟡 **Yellow squiggly lines** - Warnings (potential bugs, code quality issues)
- Hover over any line to see detailed suggestions

### After Full Review
Code Armour provides a comprehensive report with:

#### 🔴 Security Fixes
```
- Line 15: Removed hardcoded API key
  Why: Exposes sensitive credentials to attackers
```

#### 🟠 Bug Fixes
```
- Line 23: Added null check for user object
  Why: User can be undefined after logout, causing app crash
```

#### 🟡 Code Quality Improvements
```
- Line 8: Removed console.log statement
- Line 30: Renamed 'x' to 'userAge' for better readability
```

#### 🟢 Flow Structure
```
1. Configuration setup kiya
2. Input validation banaya
3. Error handling implement kiya
4. API calls optimize kiye
```

#### 🔵 Motivation
```
Tumne error handling bahut achhe se socha hai! 
Keep coding and you'll become a pro! 🚀
```

---

## ⚙️ Settings

Access settings via: `File > Preferences > Settings` → Search "Code Armour"

### Available Settings:

**`codeArmour.realTimeEnabled`** (Default: `true`)
- Enable/disable real-time code review while typing

**`codeArmour.autoFixOnSave`** (Default: `false`)
- Automatically apply fixes when you save the file

---

## 📊 Example Workflow

1. **Open any code file** (e.g., `app.js`)
2. **Type some code** with potential issues
3. **Wait 2 seconds** - Real-time review kicks in
4. **See red/yellow lines** under problematic code
5. **Click "Review Current File"** from notification
6. **Choose an action:**
   - ✅ **Yes - Apply all fixes** - Auto-fixes your code
   - ❌ **No - Keep current** - Keep your original code
   - ⏳ **Wait Please** - Read the report first, decide later
7. **View detailed report** in Output panel

---

## 🔧 Requirements

- **VSCode Version:** 1.85.0 or higher
- **Google GenAI API Key** (Free): [Get it here](https://aistudio.google.com/apikey)
- **Internet Connection** (for AI analysis)

---

## 🐛 Known Issues & Troubleshooting

### Issue: "API Key not set" error
**Solution:** Run command `Code Armour: Set API Key` and enter your key

### Issue: Real-time review not working
**Solution:** 
1. Check if it's enabled: `Code Armour: Toggle Real-time Review`
2. Wait 2-3 seconds after typing for analysis
3. Check Output panel for errors

### Issue: No squiggly lines appearing
**Solution:**
1. Open Problems panel: `Ctrl+Shift+M` (Windows) or `Cmd+Shift+M` (Mac)
2. Make sure your file type is supported
3. Toggle real-time review off and on again

---

## 🌟 Why Code Armour?

Unlike traditional linters, Code Armour:
- ✅ Uses AI to understand **context and intent**
- ✅ Provides **detailed explanations** for every issue
- ✅ Suggests **optimized solutions**, not just flags errors
- ✅ Works across **multiple languages**
- ✅ Gives **motivational feedback** to keep you going
- ✅ Adds **Hinglish comments** for better understanding

**Don't Stop Until Your Code Wins! 🔥**

---

## 📝 License

MIT License - Feel free to use and modify!

---

## 🐛 Found a Bug?

## 🐛 Found a Bug?

Report issues on [GitHub Issues](https://github.com/shreyg0e1/code-armour/issues)

---

## 👨‍💻 Author

**Shrey Goel**  
🌐 [GitHub](https://github.com/shreyg0e1)

---

## 🙏 Acknowledgments

- Powered by Google Generative AI (Gemini)
- Built with ❤️ for developers by developers

---

**⭐ If Code Armour helps you write better code, please star the repository!**
```
