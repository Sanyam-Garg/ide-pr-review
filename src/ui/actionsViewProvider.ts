import * as vscode from 'vscode';
import { ReviewSession } from './session';

export class ReviewActionsProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'pr-review-actions';

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            const session = ReviewSession.getInstance();
            try {
                switch (data.type) {
                    case 'approve':
                        if (!data.body) {
                            // Approval can optionally have a comment, but usually good practice. 
                            // GitHub API allows empty body for approval.
                        }
                        await session.submitReview('APPROVE', data.body || '');
                        vscode.window.showInformationMessage('PR Approved!');
                        break;
                    case 'request-changes':
                        if (!data.body) {
                            vscode.window.showErrorMessage('Comment is required for requesting changes.');
                            return;
                        }
                        await session.submitReview('REQUEST_CHANGES', data.body);
                        vscode.window.showInformationMessage('Changes Requested!');
                        break;
                    case 'comment':
                        if (!data.body) {
                            vscode.window.showErrorMessage('Comment body cannot be empty.');
                            return;
                        }
                        await session.submitReview('COMMENT', data.body);
                        vscode.window.showInformationMessage('Comment submitted!');
                        break;
                    case 'submit':
                        await session.submitReview('COMMENT', data.body);
                        vscode.window.showInformationMessage('Demo comment submitted!');
                        break;
                    case 'assign-reviewers':
                        const reviewers = data.reviewers.split(',').map((u: string) => u.trim()).filter((u: string) => u.length > 0);
                        if (reviewers.length > 0) {
                            await session.requestReviewers(reviewers);
                            vscode.window.showInformationMessage(`Reviewers assigned: ${reviewers.join(', ')}`);
                        } else {
                            vscode.window.showErrorMessage('Please enter at least one username.');
                        }
                        break;
                    case 'error':
                        vscode.window.showErrorMessage(data.message);
                        break;
                }
            } catch (e: any) {
                vscode.window.showErrorMessage(`Action failed: ${e.message}`);
                console.error(e);
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					:root {
                        --container-padding: 20px;
                        --input-padding-vertical: 6px;
                        --input-padding-horizontal: 8px;
                        --input-margin-vertical: 4px;
                        --input-margin-horizontal: 0;
                    }

                    body {
                        margin: 0;
                        padding: var(--container-padding);
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        font-weight: var(--vscode-font-weight);
                        font-size: var(--vscode-font-size);
                    }

                    h3 {
                        margin-top: 0;
                        margin-bottom: 12px;
                        font-size: 1.1em;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        color: var(--vscode-descriptionForeground);
                    }

                    textarea {
                        width: 100%;
                        height: 120px;
                        box-sizing: border-box; 
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 2px;
                        padding: 8px;
                        margin-bottom: 16px;
                        resize: vertical;
                        font-family: inherit;
                    }

                    textarea:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                        border-color: var(--vscode-focusBorder);
                    }

                    .actions {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        margin-bottom: 24px;
                    }

                    .primary-actions {
                         display: flex;
                         gap: 10px;
                    }
                    
                    .primary-actions button {
                        flex: 1;
                    }

                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 14px;
                        border-radius: 2px;
                        cursor: pointer;
                        font-family: inherit;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    
                    button.secondary {
                         background-color: var(--vscode-button-secondaryBackground);
                         color: var(--vscode-button-secondaryForeground);
                    }

                    button.secondary:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }

                    .separator {
                        height: 1px;
                        background-color: var(--vscode-widget-border);
                        margin: 16px 0;
                        opacity: 0.5;
                    }

                    .reviewers-section input {
                         width: 100%;
                         box-sizing: border-box;
                         background-color: var(--vscode-input-background);
                         color: var(--vscode-input-foreground);
                         border: 1px solid var(--vscode-input-border);
                         padding: 6px 8px;
                         margin-bottom: 10px;
                    }
                    
                    .reviewers-section input:focus {
                         outline: 1px solid var(--vscode-focusBorder);
                    }
				</style>
			</head>
			<body>
				
                <div>
				    <label for="review-body">Review Comment</label>
                    <textarea id="review-body" placeholder="Leave your comment here..."></textarea>
                </div>
                
                <div class="actions">
                    <button id="btn-approve">Approve</button>
                    <div class="primary-actions">
                        <button class="secondary" id="btn-comment">Comment</button>
                        <button class="secondary" id="btn-request-changes">Request Changes</button>
                    </div>
                </div>

                <div class="separator"></div>

                <div class="reviewers-section">
                    <h3>Assign Reviewers</h3>
                    <input type="text" id="reviewers-input" placeholder="username1, username2" />
                    <button class="secondary" id="btn-assign">Add Reviwers</button>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();

                    function postMessage(type, payload = {}) {
                        try {
                             vscode.postMessage({ type, ...payload });
                        } catch (e) {
                             console.error('Error posting message:', e);
                             // Fallback or alert in webview
                        }
                    }

                    document.getElementById('btn-approve').addEventListener('click', () => {
                        const body = document.getElementById('review-body').value;
                        postMessage('approve', { body });
                    });
                    
                    document.getElementById('btn-comment').addEventListener('click', () => {
                        const body = document.getElementById('review-body').value;
                        postMessage('comment', { body });
                    });

                    document.getElementById('btn-request-changes').addEventListener('click', () => {
                        const body = document.getElementById('review-body').value;
                        postMessage('request-changes', { body });
                    });

                    document.getElementById('btn-assign').addEventListener('click', () => {
                        const reviewers = document.getElementById('reviewers-input').value;
                        postMessage('assign-reviewers', { reviewers });
                    });
                </script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
