# Changelog

All notable changes to the "ide-pr-review" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-21

### Added
- **Final Review View**: A dedicated dashboard for submitting reviews.
    - Approve PRs with optional comments.
    - Request changes with mandatory feedback.
    - Assign reviewers by GitHub username (supports multiple).
- **In-Editor Commenting**:
    - View existing GitHub comments directly in line with code.
    - Add new comments on changed lines using the gutter "+" button.
    - Support for **multiline comments** by dragging and selecting lines in the diff view.
    - Reply to existing threads directly from VS Code.
- **Improved File Navigation**:
    - Tree view displays **all files** in the PR, distinguishing between files with comments and those without.
    - Auto-opens the PR sidebar on load.
- **Smart Validation**:
    - Restricts commenting to valid diff hunks to prevent "Validation Failed" (422) errors.
    - Validates GitHub usernames before assignment.

### Fixed
- Fixed issue where only commented files were visible in the review tree.
- Fixed button styling and functionality in the Final Review webview.
- Fixed API interaction errors when commenting on lines outside the diff context.