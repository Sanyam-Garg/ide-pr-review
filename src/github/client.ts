export class GithubClient {
    constructor(private token: string) {}

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
            throw new Error(`GitHub API error: ${res.status}`);
        }

        return res.json() as Promise<T>;
    }
}