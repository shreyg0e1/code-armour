// ============================================
// CODE ARMOUR - AI Code Review Extension
// Production-ready with ALL features + Custom Summaries
// ============================================

const vscode = require('vscode');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// 1. Global variables aur state management
// ============================================

let aiClient = null;
let outputChannel = null;
let diagnosticCollection = null;
let realTimeReviewTimeout = null;
let pendingReviewDecision = null; // For "Wait Please" functionality



// ============================================
// 2. Extension activate hone pe ye function chalega
// ============================================

function activate(context) {
    console.log('🛡️ Code Armour extension is now active!');

    outputChannel = vscode.window.createOutputChannel('Code Armour');
    diagnosticCollection = vscode.languages.createDiagnosticCollection('code-armour');

    // Commands register karo
    const reviewFileCmd = vscode.commands.registerCommand(
        'code-armour.reviewCurrentFile', 
        reviewCurrentFile
    );

    const reviewWorkspaceCmd = vscode.commands.registerCommand(
        'code-armour.reviewWorkspace', 
        reviewWorkspace
    );

    const setApiKeyCmd = vscode.commands.registerCommand(
        'code-armour.setApiKey', 
        setApiKey
    );

    const toggleRealTimeCmd = vscode.commands.registerCommand(
        'code-armour.toggleRealTime', 
        toggleRealTime
    );

    // Event listeners
    const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('codeArmour');
        if (config.get('autoFixOnSave')) {
            await reviewDocument(document, true);
        }
    });

    const onChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        const config = vscode.workspace.getConfiguration('codeArmour');
        if (config.get('realTimeEnabled') && aiClient) {
            if (realTimeReviewTimeout) {
                clearTimeout(realTimeReviewTimeout);
            }
            realTimeReviewTimeout = setTimeout(() => {
                performRealTimeReview(event.document);
            }, 2000);
        }
    });

    const onEditorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            diagnosticCollection.delete(editor.document.uri);
        }
    });

    context.subscriptions.push(
        reviewFileCmd,
        reviewWorkspaceCmd,
        setApiKeyCmd,
        toggleRealTimeCmd,
        onSaveListener,
        onChangeListener,
        onEditorChangeListener,
        outputChannel,
        diagnosticCollection
    );

    // IMPORTANT: Initialize AI FIRST, then check
    initializeAI();

    // Check if API key exists AFTER initialization
    const config = vscode.workspace.getConfiguration('codeArmour');
    const apiKey = config.get('apiKey');

    if (!apiKey || apiKey.trim() === '') {
        // No API key - ONLY show Set API Key
        vscode.window.showInformationMessage(
            '🛡️ Code Armour activated! Set your API key to start.',
            'Set API Key'
        ).then(selection => {
            if (selection === 'Set API Key') {
                setApiKey();
            }
        });
    } else {
        // API key exists - Show permanent action menu
        showActionMenu();
    }
}

// ============================================
// 3. Show permanent action menu
// ============================================

function showActionMenu() {
    vscode.window.showInformationMessage(
        '✅ Code Armour is ready! Choose an action:',
        'Review Current File',
        'Review Workspace',
        'Toggle Real-Time Review',
        'Change API Key'
    ).then(selection => {
        if (selection === 'Review Current File') {
            reviewCurrentFile();
            // Show menu again after 1 second
            setTimeout(() => showActionMenu(), 1000);
        } else if (selection === 'Review Workspace') {
            reviewWorkspace();
            // Show menu again after 1 second
            setTimeout(() => showActionMenu(), 1000);
        } else if (selection === 'Toggle Real-Time Review') {
            toggleRealTime();
            // Show menu again immediately
            setTimeout(() => showActionMenu(), 500);
        } else if (selection === 'Change API Key') {
            setApiKey();
            // Show menu again after 1 second
            setTimeout(() => showActionMenu(), 1000);
        }
    });
}

// ============================================
// 4. AI client initialize karo
// ============================================

function initializeAI() {
    try {
        const config = vscode.workspace.getConfiguration('codeArmour');
        const apiKey = config.get('apiKey');

        if (apiKey && apiKey.trim() !== '') {
            aiClient = new GoogleGenerativeAI(apiKey.trim());
            outputChannel.appendLine('✅ AI Client initialized successfully');
        } else {
            outputChannel.appendLine('⚠️ API Key not set. Check Notifications to set API 🔔(recoomended) or Use Palette command: "Code Armour: Set API Key"');
        }
    } catch (error) {
        outputChannel.appendLine(`❌ AI initialization error: ${error.message}`);
        aiClient = null;
    }
}

// ============================================
// 5. API Key set karne ka function
// ============================================

async function setApiKey() {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Google GenAI API Key',
        placeHolder: 'Get your FREE key from: https://aistudio.google.com/apikey',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'API Key cannot be empty';
            }
            return null;
        }
    });

    if (apiKey && apiKey.trim() !== '') {
        try {
            const config = vscode.workspace.getConfiguration('codeArmour');
            await config.update('apiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
            
            initializeAI();
            
            vscode.window.showInformationMessage('✅ API Key saved! Code Armour is ready to use.');
            outputChannel.appendLine('✅ API Key configured successfully');
            // Show action menu immediately after API key is set
            setTimeout(() => showActionMenu(), 500);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save API Key: ${error.message}`);
        }
    }
}

// ============================================
// 6. Real-time review toggle
// ============================================

async function toggleRealTime() {
    const config = vscode.workspace.getConfiguration('codeArmour');
    const currentState = config.get('realTimeEnabled');
    
    await config.update('realTimeEnabled', !currentState, vscode.ConfigurationTarget.Global);
    
    const newState = !currentState ? 'Enabled ✅' : 'Disabled ❌';
    vscode.window.showInformationMessage(`Real-time Review: ${newState}`);
    outputChannel.appendLine(`Real-time review ${newState}`);
}

// ============================================
// 7. Current file review
// ============================================

async function reviewCurrentFile() {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('⚠️ No file is currently open');
        return;
    }

    await reviewDocument(editor.document, false);
}

// ============================================
// 8. CHANGE 1 & 3: Document review with improved dialog
// ============================================

async function reviewDocument(document, autoFix = false) {
    if (!aiClient) {
        const result = await vscode.window.showWarningMessage(
            '⚠️ API Key not set. Set it now?',
            'Yes',
            'No'
        );
        if (result === 'Yes') {
            await setApiKey();
            if (!aiClient) return;
        } else {
            return;
        }
    }

    if (!isReviewableFile(document.fileName)) {
        vscode.window.showInformationMessage('ℹ️ This file type is not supported');
        return;
    }

    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🛡️ Code Armour',
        cancellable: false
    }, async (progress) => {
        try {
            progress.report({ message: 'Analyzing code...', increment: 10 });

            const fileName = path.basename(document.fileName);
            const code = document.getText();
            const fileExtension = path.extname(fileName);

            outputChannel.clear();
            outputChannel.show();
            outputChannel.appendLine('🛡️ CODE ARMOUR - AI Code Review');
            outputChannel.appendLine('='.repeat(50));
            outputChannel.appendLine(`📄 File: ${fileName}`);
            outputChannel.appendLine(`📊 Lines: ${document.lineCount}`);
            outputChannel.appendLine(`🔤 Characters: ${code.length}`);
            outputChannel.appendLine('='.repeat(50) + '\n');
            outputChannel.appendLine('🔍 Sending to AI for deep analysis...\n');

            progress.report({ message: 'AI is analyzing...', increment: 30 });

            // CHANGE 1: Single file gets individual format
            const reviewResult = await performAIReview(fileName, code, fileExtension, false);

            progress.report({ message: 'Processing results...', increment: 50 });

            outputChannel.appendLine('\n' + '='.repeat(50));
            outputChannel.appendLine('📊 REVIEW COMPLETE');
            outputChannel.appendLine('='.repeat(50) + '\n');
            outputChannel.appendLine(reviewResult.summary);

            progress.report({ message: 'Review complete!', increment: 100 });

            if (reviewResult.hasChanges) {
                if (autoFix) {
                    await applyFixes(document, reviewResult.fixedCode);
                    vscode.window.showInformationMessage('✅ Code Armour: Fixes applied automatically!');
                } else {
                    // CHANGE 3: Improved dialog with "Wait Please" option
                    await showReviewDecisionDialog(document, reviewResult);
                }
            } else {
                vscode.window.showInformationMessage('✅ Perfect! No issues found. 🎉');
            }

            return Promise.resolve();

        } catch (error) {
            const errorMsg = `Review failed: ${error.message}`;
            outputChannel.appendLine(`\n❌ ERROR: ${errorMsg}`);
            vscode.window.showErrorMessage(`🛡️ ${errorMsg}`);
            return Promise.reject(error);
        }
    });
}

// ============================================
// 9. CHANGE 3: Show review decision dialog with "Wait Please"
// ============================================

async function showReviewDecisionDialog(document, reviewResult) {
    const answer = await vscode.window.showInformationMessage(
        `🛡️ Code Armour found ${reviewResult.issueCount || 'multiple'} issues in your code.`,
        {
            modal: true,
            detail: 'Choose an action:\n\n' +
                    '✅ Yes - Apply all fixes to your file\n' +
                    '❌ No - Keep current code\n' +
                    '⏳ Wait Please - Let me read the output and decide'
        },
        'Yes - Apply all fixes',
        'No - Keep current',
        'Wait Please'
    );

    if (answer === 'Yes - Apply all fixes') {
        await applyFixes(document, reviewResult.fixedCode);
        vscode.window.showInformationMessage('✅ All fixes applied successfully!');
    } else if (answer === 'No - Keep current') {
        vscode.window.showInformationMessage('Code kept as-is. Review report is in Output panel.');
    } else if (answer === 'Wait Please') {
        // Store pending decision
        pendingReviewDecision = { document, reviewResult };
        
        // Show in notification area (bottom-right)
        const notificationAnswer = await vscode.window.showInformationMessage(
            '🛡️ Code Armour: Review complete! Ready to apply fixes?',
            'Yes, Apply Fixes',
            'No, Keep Current',
            'View Report'
        );

        if (notificationAnswer === 'Yes, Apply Fixes') {
            await applyFixes(document, reviewResult.fixedCode);
            vscode.window.showInformationMessage('✅ All fixes applied successfully!');
        } else if (notificationAnswer === 'View Report') {
            outputChannel.show();
        } else {
            vscode.window.showInformationMessage('Code kept as-is.');
        }

        pendingReviewDecision = null;
    }
}

// ============================================
// 10. Real-time review
// ============================================

async function performRealTimeReview(document) {
    if (!aiClient || !isReviewableFile(document.fileName)) {
        return;
    }

    try {
        const code = document.getText();
        const fileName = path.basename(document.fileName);

        const model = aiClient.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp" 
        });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `Quick code analysis for ${fileName}:

\`\`\`
${code}
\`\`\`

Find CRITICAL issues only (security risks, syntax errors, null pointer bugs).
Format: LINE_NUMBER:SEVERITY:MESSAGE

Example:
15:error:Hardcoded API key detected
23:warning:Potential null pointer exception

Keep it SHORT (max 5 issues).`
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 500
            }
        });

        const diagnostics = parseRealTimeIssues(result.response.text(), document);
        diagnosticCollection.set(document.uri, diagnostics);

    } catch (error) {
        console.error('Real-time review error:', error);
    }
}

// ============================================
// 11. Parse real-time issues
// ============================================

function parseRealTimeIssues(responseText, document) {
    const diagnostics = [];
    const lines = responseText.split('\n');

    for (const line of lines) {
        const match = line.match(/(\d+):(error|warning|info):(.+)/i);
        if (match) {
            const lineNum = parseInt(match[1]) - 1;
            const severity = match[2].toLowerCase();
            const message = match[3].trim();

            if (lineNum >= 0 && lineNum < document.lineCount) {
                const range = document.lineAt(lineNum).range;
                
                let diagnosticSeverity;
                if (severity === 'error') {
                    diagnosticSeverity = vscode.DiagnosticSeverity.Error;
                } else if (severity === 'warning') {
                    diagnosticSeverity = vscode.DiagnosticSeverity.Warning;
                } else {
                    diagnosticSeverity = vscode.DiagnosticSeverity.Information;
                }

                diagnostics.push(new vscode.Diagnostic(
                    range,
                    message,
                    diagnosticSeverity
                ));
            }
        }
    }

    return diagnostics;
}

// ============================================
// 12. CHANGE 1: AI review with format based on context
// ============================================

async function performAIReview(fileName, code, fileExtension, isWorkspaceReview = false) {
    const History = [{
        role: 'user',
        parts: [{
            text: `Review this ${fileName} file:

\`\`\`${fileExtension.slice(1)}
${code}
\`\`\`

Provide:
1. Fixed code (if issues found)
2. Detailed summary report

If no issues: Say "NO_CHANGES_NEEDED"`
        }]
    }];

    try {
        const model = aiClient.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            systemInstruction: `You are CODE ARMOUR - Expert AI Code Reviewer.

**YOUR MISSION:**
Analyze code for 6 key areas: Security, Bugs, Quality, Optimization, Logic Teaching, Motivation.

**ANALYSIS CHECKLIST:**

🔴 SECURITY (Professional-level edge cases):
- Hardcoded secrets (API keys, passwords, tokens)
- eval(), innerHTML, dangerouslySetInnerHTML
- XSS vulnerabilities
- SQL/NoSQL injection risks
- File path traversal
- CORS misconfigurations
- Unvalidated redirects
- Insecure dependencies
- Missing input sanitization
- Weak authentication/authorization

🟠 BUGS (Find & explain why):
- Null/undefined access
- Array index out of bounds
- Type mismatches
- Async/await missing
- Race conditions
- Memory leaks
- Infinite loops
- Missing return statements
- Variable shadowing
- Incorrect comparisons (== vs ===)
- HTML syntax errors (missing quotes, wrong attributes)
- CSS typos (property names)

🟡 CODE QUALITY (Best practices):
- Remove console.log/debugger
- Unused variables/imports
- Dead code removal
- Poor naming (use clear names)
- Magic numbers (use constants)
- Deep nesting (refactor)
- Long functions (split them)
- Missing error handling
- Code duplication
- HTML structure issues
- CSS formatting

💚 OPTIMIZATION:
- Add Hinglish comments (like: "// User ka data fetch kar rahe hain")
- Improve algorithms (O(n²) → O(n))
- Cache repeated calculations
- Lazy loading where needed
- Reduce API calls
- Optimize loops
- Use built-in methods

**RESPONSE FORMAT FOR INDIVIDUAL FILE REVIEW:**

If changes needed:
\`\`\`
[COMPLETE_FIXED_CODE_HERE_WITH_HINGLISH_COMMENTS]
\`\`\`

📊 CODE REVIEW COMPLETE

Total Issues Found: X

🔴 SECURITY FIXES:
- Line 15: Removed hardcoded API key
  Why: Exposes sensitive credentials
- Line 42: Replaced eval() with JSON.parse()
  Why: eval() allows arbitrary code execution

🟠 BUG FIXES:
- Line 23: Added null check for user object
  Why: User object can be undefined after logout, causing crash
- Line 56: Fixed array index check
  Why: Array.length can be 0, accessing [0] throws error

🟡 CODE QUALITY IMPROVEMENTS:
- Line 8: Removed console.log statement
- Line 30: Renamed 'x' to 'userAge' for clarity
- Line 45: Extracted duplicate logic into function

🟢 FLOW STRUCTURE OF OPTIMIZED CODE:

1. **Configuration setup kiya**
   → Constants aur environment variables load kiye

2. **Input validation banaya**
   → User input ko sanitize aur validate kiya

3. **Error handling implement kiya**
   → try-catch blocks lagaye critical sections me

4. **API calls optimize kiye**
   → Promise.all() use karke parallel requests

5. **Response format kiya**
   → Consistent structure me data return kiya

6. **Hinglish comments add kiye**
   → Har important section ko explain kiya

7. **Edge cases handle kiye**
   → Empty arrays, null values, undefined checks

🔵 MOTIVATION:
Tumne error handling bahut achhe se socha hai, ab bas performance optimize karo aur pro ban jao!

If no issues:
NO_CHANGES_NEEDED`
        });

        const result = await model.generateContent({
            contents: History,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8000,
            }
        });

        const responseText = result.response.text().trim();

        if (responseText.includes('NO_CHANGES_NEEDED')) {
            return {
                hasChanges: false,
                fixedCode: code,
                summary: '✅ NO ISSUES FOUND!\n\nYour code is clean, secure, and well-optimized. Great work! 🎉',
                issueCount: 0
            };
        }

        const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
        const fixedCode = codeMatch ? codeMatch[1].trim() : code;
        
        let summary = responseText;
        if (codeMatch) {
            summary = responseText.substring(responseText.indexOf('```', codeMatch.index + 3) + 3).trim();
        }

        const issueCount = (
            (summary.match(/🔴/g) || []).length +
            (summary.match(/🟠/g) || []).length +
            (summary.match(/🟡/g) || []).length
        );

        return {
            hasChanges: fixedCode !== code,
            fixedCode: fixedCode,
            summary: summary || 'Review completed with changes.',
            issueCount: issueCount
        };

    } catch (error) {
        if (error.message.includes('API_KEY')) {
            throw new Error('Invalid API Key. Please set a valid Google GenAI API key.');
        }
        throw new Error(`AI Review failed: ${error.message}`);
    }
}

// ============================================
// 13. Apply fixes to document
// ============================================

async function applyFixes(document, fixedCode) {
    try {
        const edit = new vscode.WorkspaceEdit();
        
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        
        edit.replace(document.uri, fullRange, fixedCode);
        
        const success = await vscode.workspace.applyEdit(edit);
        
        if (success) {
            await document.save();
            outputChannel.appendLine('\n✅ Fixes applied and saved successfully!');
            vscode.window.showInformationMessage('✅ Code fixed and saved!');
        } else {
            throw new Error('Failed to apply edits');
        }
    } catch (error) {
        outputChannel.appendLine(`\n❌ Error applying fixes: ${error.message}`);
        vscode.window.showErrorMessage(`Failed to apply fixes: ${error.message}`);
    }
}

// ============================================
// 14. CHANGE 2: WORKSPACE REVIEW WITH GROUPED SUMMARY
// ============================================

async function reviewWorkspace() {
    if (!aiClient) {
        const result = await vscode.window.showWarningMessage(
            '⚠️ API Key not set. Set it now?',
            'Yes',
            'No'
        );
        if (result === 'Yes') {
            await setApiKey();
            if (!aiClient) return;
        } else {
            return;
        }
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('⚠️ No workspace folder is open');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '🛡️ Code Armour - Workspace Review',
        cancellable: true
    }, async (progress, token) => {
        
        try {
            outputChannel.clear();
            outputChannel.show();
            outputChannel.appendLine('🛡️ CODE ARMOUR - WORKSPACE REVIEW');
            outputChannel.appendLine('='.repeat(50) + '\n');

            const rootPath = workspaceFolders[0].uri.fsPath;
            
            progress.report({ message: 'Scanning project files...' });
            const files = await scanWorkspaceFiles(rootPath);
            
            outputChannel.appendLine(`📂 Found ${files.length} reviewable files\n\n`);

            if (files.length === 0) {
                vscode.window.showInformationMessage('No reviewable files found in workspace.');
                return;
            }

            let reviewedCount = 0;
            let fixedCount = 0;
            const allIssues = {
                security: [],
                bugs: [],
                quality: [],
                flows: []
            };

            // Har file ko review karo
            for (const file of files) {
                if (token.isCancellationRequested) {
                    outputChannel.appendLine('\n⚠️ Review cancelled by user');
                    break;
                }

                progress.report({ 
                    message: `Reviewing ${reviewedCount + 1}/${files.length}: ${path.basename(file)}`,
                    increment: (100 / files.length)
                });

                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const fileName = path.basename(file);
                    const fileExt = path.extname(file);
                    
                    outputChannel.appendLine(`📝 [${reviewedCount + 1}/${files.length}] ${fileName}`);
                    
                    const result = await performAIReview(fileName, content, fileExt, true);
                    
                    if (result.hasChanges) {
                        fixedCount++;
                        outputChannel.appendLine('  ⚠️ Issues found - Fixing...');
                        
                        await fs.writeFile(file, result.fixedCode, 'utf-8');
                        outputChannel.appendLine('  ✅ Fixed and saved\n');
                        
                        extractIssues(result.summary, fileName, fileExt, allIssues);
                    } else {
                        outputChannel.appendLine('  ✅ No issues\n');
                    }

                    reviewedCount++;

                } catch (error) {
                    outputChannel.appendLine(`  ❌ Error: ${error.message}\n`);
                }
            }

            // Final summary
            outputChannel.appendLine('='.repeat(50));
            outputChannel.appendLine('📊 WORKSPACE REVIEW COMPLETE');
            outputChannel.appendLine('='.repeat(50) + '\n');
            outputChannel.appendLine(`📈 Statistics:`);
            outputChannel.appendLine(`   Total Files Reviewed: ${reviewedCount}`);
            outputChannel.appendLine(`   Files Fixed: ${fixedCount}`);
            outputChannel.appendLine(`   Files Clean: ${reviewedCount - fixedCount}\n\n`);

            if (fixedCount > 0) {
                generateWorkspaceSummary(allIssues, outputChannel);
            }

            vscode.window.showInformationMessage(
                `✅ Workspace review complete! ${fixedCount}/${reviewedCount} files fixed.`,
                'View Report'
            ).then(selection => {
                if (selection === 'View Report') {
                    outputChannel.show();
                }
            });

        } catch (error) {
            outputChannel.appendLine(`\n❌ Workspace review error: ${error.message}`);
            vscode.window.showErrorMessage(`Workspace Review Error: ${error.message}`);
        }
    });
}

// ============================================
// 15. Extract issues from reviews
// ============================================

function extractIssues(summary, fileName, fileExt, allIssues) {
    const fileType = getFileType(fileExt);
    
    // CHANGE 2: Extract security fixes (only JS)
    if (fileType === 'JS') {
        const securitySection = summary.match(/🔴 SECURITY FIXES:([\s\S]*?)(?=🟠|🟡|🟢|🔵|$)/);
        if (securitySection) {
            const lines = securitySection[1].trim().split('\n').filter(l => l.trim().startsWith('-'));
            lines.forEach(line => {
                allIssues.security.push({ file: fileName, type: fileType, issue: line.trim() });
            });
        }
    }

    // Extract bugs with "Why" explanations
    const bugsSection = summary.match(/🟠 BUG FIXES:([\s\S]*?)(?=🟡|🟢|🔵|$)/);
    if (bugsSection) {
        const lines = bugsSection[1].trim().split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('Why:'));
        lines.forEach(line => {
            allIssues.bugs.push({ file: fileName, type: fileType, issue: line.trim() });
        });
    }

    // Extract quality
    const qualitySection = summary.match(/🟡 CODE QUALITY IMPROVEMENTS:([\s\S]*?)(?=🟢|🔵|$)/);
    if (qualitySection) {
        const lines = qualitySection[1].trim().split('\n').filter(l => l.trim().startsWith('-'));
        lines.forEach(line => {
            allIssues.quality.push({ file: fileName, type: fileType, issue: line.trim() });
        });
    }

    // CHANGE 2: Extract flow (only HTML and JS)
    if (fileType === 'HTML' || fileType === 'JS') {
        const flowSection = summary.match(/🟢 FLOW STRUCTURE OF OPTIMIZED CODE:([\s\S]*?)(?=🔵|$)/);
        if (flowSection) {
            allIssues.flows.push({ file: fileName, type: fileType, flow: flowSection[1].trim() });
        }
    }
}

// ============================================
// 16. Get file type
// ============================================

function getFileType(ext) {
    const jsExts = ['.js', '.jsx', '.ts', '.tsx'];
    const htmlExts = ['.html', '.htm'];
    const cssExts = ['.css', '.scss', '.sass', '.less'];
    
    if (jsExts.includes(ext.toLowerCase())) return 'JS';
    if (htmlExts.includes(ext.toLowerCase())) return 'HTML';
    if (cssExts.includes(ext.toLowerCase())) return 'CSS';
    return 'OTHER';
}

// ============================================
// 17. CHANGE 2: Generate workspace summary (grouped format)
// ============================================

function generateWorkspaceSummary(allIssues, output) {
    const totalIssues = 
        allIssues.security.length + 
        allIssues.bugs.length + 
        allIssues.quality.length;

    output.appendLine(`📊 Summary:\n`);
    output.appendLine(`Total Issues Found: ${totalIssues}\n`);

    // Security fixes (JS only)
    if (allIssues.security.length > 0) {
        output.appendLine(`🔴 SECURITY FIXES:\n`);
        output.appendLine(`      JS:`);
        allIssues.security.forEach(item => {
            output.appendLine(item.issue);
        });
        output.appendLine('');
    }

    // Bug fixes (by file type with Why)
    if (allIssues.bugs.length > 0) {
        output.appendLine(`🟠 BUG FIXES:\n`);
        
        ['HTML', 'CSS', 'JS'].forEach(type => {
            const typeBugs = allIssues.bugs.filter(i => i.type === type);
            if (typeBugs.length > 0) {
                output.appendLine(`      ${type}:\n`);
                typeBugs.forEach(item => {
                    output.appendLine(item.issue);
                });
                output.appendLine('');
            }
        });
    }

    // Quality improvements (by file type)
    if (allIssues.quality.length > 0) {
        output.appendLine(`🟡 CODE QUALITY IMPROVEMENTS:\n`);
        
        ['HTML', 'CSS', 'JS'].forEach(type => {
            const typeQuality = allIssues.quality.filter(i => i.type === type);
            if (typeQuality.length > 0) {
                output.appendLine(`      ${type}:\n`);
                typeQuality.forEach(item => {
                    output.appendLine(item.issue);
                });
                output.appendLine('');
            }
        });
    }

    // Flow structure (HTML and JS only)
    if (allIssues.flows.length > 0) {
        output.appendLine(`🟢 FLOW STRUCTURE OF OPTIMIZED CODE:\n`);
        
        ['HTML', 'JS'].forEach(type => {
            const typeFlows = allIssues.flows.filter(i => i.type === type);
            if (typeFlows.length > 0) {
                output.appendLine(`      ${type}:\n`);
                typeFlows.forEach(item => {
                    output.appendLine(item.flow);
                });
                output.appendLine('');
            }
        });
    }

    // Motivation
    output.appendLine(`🔵 MOTIVATION:`);
    output.appendLine(`Tumne logic solid pakda hai, security thoda improve ho gayi! Keep learning! 🚀\n`);
}

// ============================================
// 18. File reviewable hai ya nahi
// ============================================

function isReviewableFile(fileName) {
    const reviewableExtensions = [
        '.js', '.jsx', '.ts', '.tsx',
        '.html', '.htm',
        '.css', '.scss', '.sass', '.less',
        '.json',
        '.py',
        '.java',
        '.cpp', '.c', '.h', '.hpp',
        '.go',
        '.rs',
        '.php',
        '.rb',
        '.swift',
        '.kt', '.kts'
    ];
    
    const skipPatterns = [
        'node_modules',
        'dist',
        'build',
        '.git',
        '.next',
        '.nuxt',
        'coverage',
        '__pycache__',
        'venv',
        '.venv',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        '.DS_Store',
        'Thumbs.db'
    ];

    for (const pattern of skipPatterns) {
        if (fileName.includes(pattern)) {
            return false;
        }
    }

    const ext = path.extname(fileName).toLowerCase();
    return reviewableExtensions.includes(ext);
}

// ============================================
// 19. Workspace files scan
// ============================================

async function scanWorkspaceFiles(directory) {
    const files = [];

    async function scan(dir) {
        try {
            const items = await fs.readdir(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);

                try {
                    const stat = await fs.stat(fullPath);

                    if (stat.isDirectory()) {
                        if (!item.startsWith('.') && 
                            item !== 'node_modules' && 
                            item !== 'dist' && 
                            item !== 'build' &&
                            item !== '__pycache__' &&
                            item !== 'venv' &&
                            item !== '.venv') {
                            await scan(fullPath);
                        }
                    } else if (stat.isFile() && isReviewableFile(fullPath)) {
                        if (stat.size < 10 * 1024 * 1024) {
                            files.push(fullPath);
                        }
                    }
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            outputChannel.appendLine(`⚠️ Cannot access: ${dir}`);
        }
    }

    await scan(directory);
    return files;
}

// ============================================
// 20. Extension deactivate
// ============================================

function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
    if (realTimeReviewTimeout) {
        clearTimeout(realTimeReviewTimeout);
    }
}

// ============================================
// 21. Export
// ============================================

module.exports = {
    activate,
    deactivate
};