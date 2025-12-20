import * as vscode from 'vscode';
import { PullRequestComment } from '../github/types';
import { GithubClient } from '../github/client';
import { GitContentProvider } from './contentProvider';

export class CommentManager implements vscode.CommentingRangeProvider {
    private commentController: vscode.CommentController;

    constructor(
        private baseSha: string,
        private gh: GithubClient,
        private owner: string,
        private repo: string,
        private prNumber: number,
        private headSha: string
    ) {
        this.commentController = vscode.comments.createCommentController('ide-pr-review', 'IDE PR Review');
        this.commentController.commentingRangeProvider = this;
    }

    private files: any[] = [];

    updateFiles(files: any[]) {
        this.files = files;
    }

    provideCommentingRanges(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.Range[] | undefined {
        if (document.uri.scheme === 'comment') {
            return undefined;
        }

        const filePath = this.getRelativePath(document.uri);
        const file = this.files.find(f => f.filename === filePath);

        if (!file || !file.patch) {
            // Fallback or no comments allowed if no patch (e.g. binary or huge file)
            return undefined;
        }

        const ranges: vscode.Range[] = [];
        const isBase = document.uri.scheme === GitContentProvider.scheme;

        // Parse Patch
        const patch = file.patch;
        const lines = patch.split('\n');

        let currentBaseLine = 0;
        let currentHeadLine = 0;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                // @@ -oldStart,oldLen +newStart,newLen @@
                const match = line.match(/@@ \-(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                if (match) {
                    currentBaseLine = parseInt(match[1]);
                    currentHeadLine = parseInt(match[2]);
                }
            } else if (line.startsWith('+')) {
                // Added line
                if (!isBase) {
                    ranges.push(new vscode.Range(currentHeadLine - 1, 0, currentHeadLine - 1, 0));
                }
                currentHeadLine++;
            } else if (line.startsWith('-')) {
                // Deleted line
                if (isBase) {
                    ranges.push(new vscode.Range(currentBaseLine - 1, 0, currentBaseLine - 1, 0));
                }
                currentBaseLine++;
            } else if (line.startsWith(' ')) {
                // Context line
                if (isBase) {
                    ranges.push(new vscode.Range(currentBaseLine - 1, 0, currentBaseLine - 1, 0));
                } else {
                    ranges.push(new vscode.Range(currentHeadLine - 1, 0, currentHeadLine - 1, 0));
                }
                currentBaseLine++;
                currentHeadLine++;
            }
        }

        return ranges;
    }

    private getRelativePath(uri: vscode.Uri): string {
        if (uri.scheme === GitContentProvider.scheme) {
            return uri.path.substring(1);
        } else {
            const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
            return uri.fsPath.replace(workspaceRoot + '/', '');
        }
    }

    addComments(comments: PullRequestComment[]) {
        const commentsByFile = new Map<string, PullRequestComment[]>();

        for (const comment of comments) {
            if (!commentsByFile.has(comment.path)) {
                commentsByFile.set(comment.path, []);
            }
            commentsByFile.get(comment.path)!.push(comment);
        }

        for (const [path, fileComments] of commentsByFile) {
            const uri = vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${path}`);

            for (const comment of fileComments) {
                const side = comment.side;
                let threadUri = uri;

                if (side === 'LEFT') {
                    // LEFT side means base
                    threadUri = vscode.Uri.parse(`pr-review:/${path}?sha=${this.baseSha}`);
                }

                var start_line = comment.original_start_line;
                var end_line = comment.original_line;

                // for single line comments, the original_start_line is null
                if (start_line === null) {
                    start_line = end_line;
                }

                const range = new vscode.Range(start_line - 1, 0, end_line - 1, 0);
                const thread = this.commentController.createCommentThread(threadUri, range, []);
                thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

                thread.comments = [{
                    body: new vscode.MarkdownString(comment.body),
                    mode: vscode.CommentMode.Preview,
                    author: {
                        name: comment.user.login,
                        iconPath: vscode.Uri.parse(comment.user.avatar_url)
                    },
                    contextValue: String(comment.id) // Store GitHub Comment ID
                }];
            }
        }
    }

    dispose() {
        this.commentController.dispose();
    }

    async reply(reply: vscode.CommentReply) {
        const thread = reply.thread;
        const text = reply.text;

        // Find parent comment ID from the FIRST comment in the thread
        if (thread.comments.length === 0) {
            return;
        }

        const parentComment = thread.comments[0];
        const parentId = parentComment.contextValue;

        if (!parentId) {
            vscode.window.showErrorMessage("Cannot reply to a thread without an ID (newly created threads need refresh).");
            return;
        }

        try {
            // POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies
            const newComment = await this.gh.request<PullRequestComment>(
                `/repos/${this.owner}/${this.repo}/pulls/${this.prNumber}/comments/${parentId}/replies`,
                {
                    method: 'POST',
                    body: JSON.stringify({ body: text })
                }
            );

            const newVsComment: vscode.Comment = {
                body: new vscode.MarkdownString(newComment.body),
                mode: vscode.CommentMode.Preview,
                author: {
                    name: newComment.user.login,
                    iconPath: vscode.Uri.parse(newComment.user.avatar_url)
                },
                contextValue: String(newComment.id)
            };

            thread.comments = [...thread.comments, newVsComment];

        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to reply: ${e.message}`);
        }
    }

    async createThread(reply: vscode.CommentReply) {
        const thread = reply.thread;
        const text = reply.text;
        const uri = thread.uri;
        const range = thread.range;
        if (!range) {
            vscode.window.showErrorMessage("Cannot create thread without a range.");
            return;
        }

        // Determine Side and Commit ID
        let side: 'LEFT' | 'RIGHT' = 'RIGHT';
        let commit_id = this.headSha;
        let filePath = uri.fsPath; // Default

        if (uri.scheme === GitContentProvider.scheme) {
            side = 'LEFT';
            commit_id = this.baseSha;
            filePath = uri.path.substring(1); // Remove leading slash
        } else {
            // Right side: Local file.
            // We need the relative path from workspace root.
            const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
            filePath = uri.fsPath.replace(workspaceRoot + '/', '');
        }

        // GitHub API lines are 1-based
        const line = range.end.line + 1;
        const startLine = range.start.line + 1;
        const isMultiline = startLine !== line;

        try {
            // POST /repos/{owner}/{repo}/pulls/{pull_number}/comments
            const body: any = {
                body: text,
                commit_id: commit_id,
                path: filePath,
                side: side,
                line: line
            };

            if (isMultiline) {
                body.start_line = startLine;
                body.start_side = side; // Usually same side
            }

            const newComment = await this.gh.request<PullRequestComment>(
                `/repos/${this.owner}/${this.repo}/pulls/${this.prNumber}/comments`,
                {
                    method: 'POST',
                    body: JSON.stringify(body)
                }
            );

            // Update VS Code Thread
            const newVsComment: vscode.Comment = {
                body: new vscode.MarkdownString(newComment.body),
                mode: vscode.CommentMode.Preview,
                author: {
                    name: newComment.user.login,
                    iconPath: vscode.Uri.parse(newComment.user.avatar_url)
                },
                contextValue: String(newComment.id)
            };

            thread.comments = [newVsComment];
            thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;

        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to create thread: ${e.message}`);
        }
    }
}
