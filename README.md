# IDE PR Review

## What this is

**IDE PR Review** is a VS Code extension that revolutionizes how you review GitHub Pull Requests. Instead of passively reading code on a webpage or manually fetching branches, this extension allows you to open, review, interact with, and approve PRs entirely within your IDE.

It brings the full context of VS Code—IntelliSense, navigation, and git integration—directly into your code review workflow.

## Why did I make this?

Reviewing complex Pull Requests is often more than just looking at diffs. To truly understand the changes, you often need to:
- Checkout the branch locally.
- Run the code.
- Navigate through function definitions and references to see how the new code flows.
- Verify that tests pass and the logic holds up in the actual environment.

Doing this manually involves context switching between the browser and the terminal, which is friction-heavy. I created **IDE PR Review** to bridge this gap, making it easy to review PRs directly from your IDE where you have all your tools at your disposal.

## How to use it

### 1. Open a Pull Request
Run the command `PR Review: Open Pull Request` from the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).
- Paste the full GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`).
- The extension will automatically checkout the PR branch and fetch all comments.

### 2. Review Files & Comments
- A **review tree view** will appear in the "PR Review" container, showing all files modified in the PR.
- Click on any file to open a diff view.
- **Comments**: Existing GitHub comments are displayed directly in the editor. You can reply to them or start new threads by clicking on the gutter.

### 3. Final Review & Approval
Once you've finished your review, expanding the **Final Review** view (which appears after a PR is loaded) allows you to:
- **Write a Summary**: Use the multi-line text box for your final thoughts.
- **Approve**: Click the "Approve" button to submit a formal GitHub approval.
- **Request Changes**: Click "Request Changes" to block the PR until issues are resolved.
- **Assign Reviewers**: Need a second opinion? Enter GitHub usernames (comma-separated) and click "Add Reviewers".

Everything is synced with GitHub in real-time.
