import * as vscode from 'vscode';
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
    `Opened PR: ${pr.title} on branch ${branchName}`
  );
}