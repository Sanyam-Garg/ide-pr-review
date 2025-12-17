// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { openPRCommand } from './ui/commands';
import { ReviewTreeProvider } from './ui/treeProvider';
import { ReviewSession } from './ui/session';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ide-pr-review" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ide-pr-review.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ide-pr-review!');
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'idePrReview.openPR',
			() => openPRCommand(context)
		)
	);



	context.subscriptions.push(
		vscode.commands.registerCommand(
			'idePrReview.reply',
			(reply: vscode.CommentReply) => {
				const session = ReviewSession.getInstance();
				if (session.commentManager) {
					session.commentManager.reply(reply);
				}
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'idePrReview.create',
			(reply: vscode.CommentReply) => {
				const session = ReviewSession.getInstance();
				if (session.commentManager) {
					session.commentManager.createThread(reply);
				}
			}
		)
	);

	const treeProvider = new ReviewTreeProvider();
	vscode.window.registerTreeDataProvider('pr-review-view', treeProvider);
}

// This method is called when your extension is deactivated
export function deactivate() { }
