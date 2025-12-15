import { PullRequestComment } from '../github/types';

export class ReviewSession {
    private static instance: ReviewSession;

    public baseSha: string | undefined;
    public comments: PullRequestComment[] = [];
    public cwd: string | undefined;
    public currentRepo: string | undefined;
    public prNumber: number | undefined;

    private constructor() { }

    public static getInstance(): ReviewSession {
        if (!ReviewSession.instance) {
            ReviewSession.instance = new ReviewSession();
        }
        return ReviewSession.instance;
    }

    public clear() {
        this.baseSha = undefined;
        this.comments = [];
        this.cwd = undefined;
        this.currentRepo = undefined;
        this.prNumber = undefined;
    }
}
