import * as vscode from 'vscode';

export async function getGithubSession() {
    return vscode.authentication.getSession(
        'github',
        ['public_repo'],
        {createIfNone: true}
    );
}