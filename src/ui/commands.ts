import * as vscode from 'vscode';
import * as cp from 'child_process';
import { getGithubSession } from '../github/auth';
import { GithubClient } from '../github/client';

interface PullRequest {
  title: string;
  head: {
    ref: string;
  };
}

export async function openPRCommand() {
  const url = await vscode.window.showInputBox({
    prompt: 'GitHub Pull Request URL',
    placeHolder: 'https://github.com/owner/repo/pull/123'
  });
  if (!url) {
    return;
  }

  const regex = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  const match = url.match(regex);

  if (!match) {
    vscode.window.showErrorMessage('Invalid GitHub PR URL');
    return;
  }

  const [, owner, repoName, prNumberStr] = match;
  const repo = `${owner}/${repoName}`;
  const prNumber = Number(prNumberStr);

  // Authenticate
  const session = await getGithubSession();
  const gh = new GithubClient(session.accessToken);

  // Fetch PR
  const pr = await gh.request<PullRequest>(
    `/repos/${repo}/pulls/${prNumber}`
  );

  const branchName = pr.head.ref;

  vscode.window.showInformationMessage(
    `Opening PR: ${pr.title} (${prNumber}) on branch ${branchName}`
  );

  if (vscode.workspace.workspaceFolders) {
    const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
    cp.exec(`git fetch origin ${branchName} && git checkout ${branchName}`, { cwd }, (err, stdout, stderr) => {
      if (err) {
        vscode.window.showErrorMessage(`Error checking out branch: ${err.message}`);
        console.error(stderr);
        return;
      }
      vscode.window.showInformationMessage(`Checked out branch: ${branchName}`);
    });
  } else {
    vscode.window.showErrorMessage('No workspace folder open');
  }
}