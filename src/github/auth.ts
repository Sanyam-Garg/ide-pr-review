import * as vscode from 'vscode';

export async function getGithubSession() {
    return vscode.authentication.getSession(
        'github',
        ['repo'],
        {createIfNone: true}
    );
}