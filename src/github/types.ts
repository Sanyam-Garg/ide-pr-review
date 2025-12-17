export interface PullRequestComment {
    id: number;
    body: string;
    path: string;
    side: 'LEFT' | 'RIGHT';
    original_start_line: number; // start line for a multiline comment. null for single line comments
    original_line: number; // this is the original end line for a comment on a multiline range
    commit_id: string;
    user: {
        login: string;
        avatar_url: string;
    };
}
