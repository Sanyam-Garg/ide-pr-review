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
        session.baseSha = pr.base.sha;
        session.comments = comments;
        session.cwd = cwd;
        session.currentRepo = repo;
        session.prNumber = prNumber;

        const commentManager = new CommentManager(pr.base.sha);
        commentManager.addComments(comments);

        vscode.window.showInformationMessage(`Loaded ${comments.length} comments.`);

        // Trigger file picker
        vscode.commands.executeCommand('idePrReview.pickReviewFile');

      } catch (error) {
        vscode.window.showErrorMessage(`Failed to load comments: ${error}`);
      }
    });
  } else {
    vscode.window.showErrorMessage('No workspace folder open');
  }
}

export async function pickReviewFileCommand() {
  const session = ReviewSession.getInstance();

  if (!session.comments || session.comments.length === 0) {
    vscode.window.showInformationMessage('No comments to review.');
    return;
  }

  const uniqueFiles = [...new Set(session.comments.map(c => c.path))];
  const selectedFile = await vscode.window.showQuickPick(uniqueFiles, {
    placeHolder: 'Select a file to review'
  });

  if (selectedFile) {
    if (!session.baseSha || !session.cwd) {
      vscode.window.showErrorMessage('Session data missing (baseSha or cwd).');
      return;
    }

    const leftUri = vscode.Uri.parse(`${GitContentProvider.scheme}:/${selectedFile}?sha=${session.baseSha}`);
    const rightUri = vscode.Uri.file(`${session.cwd}/${selectedFile}`);

    await vscode.commands.executeCommand(
      'vscode.diff',
      leftUri,
      rightUri,
      `${path.basename(selectedFile)} (Review)`
    );
  }
}