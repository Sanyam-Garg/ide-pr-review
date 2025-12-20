import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { getGithubSession } from '../github/auth';
import { GithubClient } from '../github/client';
import { PullRequestComment } from '../github/types';
import { CommentManager } from './comments';
import { GitContentProvider } from './contentProvider';
import { ReviewSession } from './session';

interface PullRequest {
  title: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export async function openPRCommand(context: vscode.ExtensionContext) {
  // Register Content Provider
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(GitContentProvider.scheme, new GitContentProvider())
  );

  const url = await vscode.window.showInputBox({
    prompt: 'GitHub Pull Request URL',
    placeHolder: 'https://github.com/owner/repo/pull/123'
  });
  if (!url) {
    return;
  }

  // Reset context in case previous load failed or new one is starting
  vscode.commands.executeCommand('setContext', 'idePrReview:prLoaded', false);

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
    cp.exec(`git fetch origin ${branchName} && git checkout ${branchName}`, { cwd }, async (err, stdout, stderr) => {
      if (err) {
        vscode.window.showErrorMessage(`Error checking out branch: ${err.message}`);
        console.error(stderr);
        return;
      }
      vscode.window.showInformationMessage(`Checked out branch: ${branchName}`);

      // Fetch comments
      try {
        const comments = await gh.request<PullRequestComment[]>(
          `/repos/${repo}/pulls/${prNumber}/comments`
        );

        const session = ReviewSession.getInstance();
        session.clear();
        session.setClient(gh);
        session.baseSha = pr.base.sha;
        session.comments = comments;
        session.cwd = cwd;
        session.currentRepo = repo;
        session.prNumber = prNumber;

        const commentManager = new CommentManager(pr.base.sha, gh, owner, repoName, prNumber, pr.head.sha);
        session.commentManager = commentManager;
        commentManager.addComments(comments);

        // Context for visibility
        vscode.commands.executeCommand('setContext', 'idePrReview:prLoaded', true);

        // Open the sidebar
        vscode.commands.executeCommand('workbench.view.extension.pr-review');

        vscode.window.showInformationMessage(`Loaded ${comments.length} comments.`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load comments: ${error}`);
      }
    });
  } else {
    vscode.window.showErrorMessage('No workspace folder open');
  }
}
