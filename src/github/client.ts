export class GithubClient {
    constructor(private token: string) { }

    async submitReview(owner: string, repo: string, number: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string): Promise<void> {
        await this.request<any>(`/repos/${owner}/${repo}/pulls/${number}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ event, body })
        });
    }

    async requestReviewers(owner: string, repo: string, number: number, reviewers: string[]): Promise<void> {
        await this.request<any>(`/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`, {
            method: 'POST',
            body: JSON.stringify({ reviewers })
        });
    }

    async request<T>(url: string, options: RequestInit = {}): Promise<T> {
        const res = await fetch(`https://api.github.com${url}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Accept": 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(options.headers || {})
            }
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`GitHub API error: ${res.status}, Body: ${errorBody}`);
        }

        return res.json() as Promise<T>;
    }
}