import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'pr-review';

    provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams(uri.query);
            const sha = params.get('sha');
            // removing the leading slash from path
            const filePath = uri.path.substring(1);

            if (!sha) {
                reject('SHA/Ref not found');
                return;
            }

            if (!vscode.workspace.workspaceFolders) {
                reject('No workspace folder open');
                return;
            }

            const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;

            cp.exec(`git show ${sha}:${filePath}`, { cwd }, (err, stdout, stderr) => {
                if (err) {
                    if (stderr.includes('exists on disk, but not in') || stderr.includes('does not exist in')) {
                        resolve('');
                    } else {
                        reject(stderr);
                    }
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}
