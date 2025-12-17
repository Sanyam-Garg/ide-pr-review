import * as vscode from 'vscode';
import { PullRequestComment } from '../github/types';
import { CommentManager } from './comments';

export class ReviewSession {
    private static instance: ReviewSession;

    private _onDidChangeSession: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeSession: vscode.Event<void> = this._onDidChangeSession.event;

    public baseSha: string | undefined;
    public comments: PullRequestComment[] = [];
    public cwd: string | undefined;
    public currentRepo: string | undefined;
    public prNumber: number | undefined;
    public commentManager: CommentManager | undefined;

    private constructor() { }

    public static getInstance(): ReviewSession {
        if (!ReviewSession.instance) {
            ReviewSession.instance = new ReviewSession();
        }
        return ReviewSession.instance;
    }

    public clear() {
        if (this.commentManager) {
            this.commentManager.dispose();
            this.commentManager = undefined;
        }
        this.baseSha = undefined;
        this.comments = [];
        this.cwd = undefined;
        this.currentRepo = undefined;
        this.prNumber = undefined;
        this._onDidChangeSession.fire();
    }

    public update() {
        this._onDidChangeSession.fire();
    }
}
