import * as vscode from 'vscode';
import { PullRequestComment } from '../github/types';
import { CommentManager } from './comments';
import { GithubClient } from '../github/client';

export class ReviewSession {
    private static instance: ReviewSession;

    private _onDidChangeSession: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeSession: vscode.Event<void> = this._onDidChangeSession.event;

    public baseSha: string | undefined;
    public comments: PullRequestComment[] = [];
    public files: any[] = [];
    public cwd: string | undefined;
    public currentRepo: string | undefined;
    public prNumber: number | undefined;
    public commentManager: CommentManager | undefined;
    private githubClient: GithubClient | undefined;

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
        this.files = [];
        this.cwd = undefined;
        this.currentRepo = undefined;
        this.prNumber = undefined;
        this._onDidChangeSession.fire();
    }

    public setClient(client: any) {
        this.githubClient = client;
    }

    public async submitReview(event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) {
        if (!this.githubClient) {
            throw new Error('GitHub client not initialized. Please run "PR Review: Open Pull Request" first.');
        }
        if (!this.currentRepo || !this.prNumber) {
            throw new Error('No active PR found. Please open a PR first.');
        }
        const [owner, repo] = this.currentRepo.split('/');
        await this.githubClient.submitReview(owner, repo, this.prNumber, event, body);
    }

    public async requestReviewers(reviewers: string[]) {
        if (!this.githubClient) {
            throw new Error('GitHub client not initialized. Please run "PR Review: Open Pull Request" first.');
        }
        if (!this.currentRepo || !this.prNumber) {
            throw new Error('No active PR found. Please open a PR first.');
        }
        const [owner, repo] = this.currentRepo.split('/');
        await this.githubClient.requestReviewers(owner, repo, this.prNumber, reviewers);
    }

    public update() {
        this._onDidChangeSession.fire();
    }
}
