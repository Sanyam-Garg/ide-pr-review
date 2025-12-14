import * as vscode from 'vscode';
import { PullRequestComment } from '../github/types';

export class CommentManager {
    private commentController: vscode.CommentController;

    constructor() {
        this.commentController = vscode.comments.createCommentController('ide-pr-review', 'IDE PR Review');
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
                var start_line = comment.original_start_line;
                var end_line = comment.original_line;

                // for single line comments, the original_start_line is null
                if (start_line === null) {
                    start_line = end_line;
                }

                const range = new vscode.Range(start_line - 1, 0, end_line - 1, 0);
                const thread = this.commentController.createCommentThread(uri, range, []);

                thread.comments = [{
                    body: new vscode.MarkdownString(comment.body),
                    mode: vscode.CommentMode.Preview,
                    author: {
                        name: comment.user.login,
                        iconPath: vscode.Uri.parse(comment.user.avatar_url)
                    }
                }];
            }
        }
    }

    dispose() {
        this.commentController.dispose();
    }
}
