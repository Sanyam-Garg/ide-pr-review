import * as vscode from 'vscode';
import * as path from 'path';
import { ReviewSession } from './session';
import { GitContentProvider } from './contentProvider';

export class ReviewTreeProvider implements vscode.TreeDataProvider<ReviewNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<ReviewNode | undefined | void> = new vscode.EventEmitter<ReviewNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ReviewNode | undefined | void> = this._onDidChangeTreeData.event;

    constructor() {
        const session = ReviewSession.getInstance();
        session.onDidChangeSession(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ReviewNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ReviewNode): Thenable<ReviewNode[]> {
        const session = ReviewSession.getInstance();

        if (!session.files || session.files.length === 0) {
            return Promise.resolve([]);
        }

        if (element) {
            return Promise.resolve(element.children || []);
        } else {
            // Root: Build tree from paths
            const filePaths = session.files.map(f => f.filename);
            const rootNodes = this.buildTree(filePaths);
            return Promise.resolve(rootNodes);
        }
    }

    private buildTree(paths: string[]): ReviewNode[] {
        const rootNodes: ReviewNode[] = [];

        paths.forEach(filePath => {
            const parts = filePath.split('/');
            let currentLevel = rootNodes;

            parts.forEach((part, index) => {
                const isFile = index === parts.length - 1;
                const existingNode = currentLevel.find(node => node.label === part && node.type === (isFile ? 'file' : 'folder'));

                if (existingNode) {
                    if (!isFile) {
                        currentLevel = existingNode.children!;
                    }
                } else {
                    const newNode = new ReviewNode(
                        part,
                        isFile ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded,
                        isFile ? 'file' : 'folder',
                        isFile ? filePath : undefined
                    );

                    if (!isFile) {
                        newNode.children = [];
                        currentLevel.push(newNode);
                        currentLevel = newNode.children;
                    } else {
                        currentLevel.push(newNode);
                    }
                }
            });
        });

        // Sort: Folders first, then files
        const sortNodes = (nodes: ReviewNode[]) => {
            nodes.sort((a, b) => {
                if (a.type === b.type) {
                    return (a.label as string).localeCompare(b.label as string);
                }
                return a.type === 'folder' ? -1 : 1;
            });
            nodes.forEach(node => {
                if (node.children) {
                    sortNodes(node.children);
                }
            });
        };

        sortNodes(rootNodes);
        return rootNodes;
    }
}

class ReviewNode extends vscode.TreeItem {
    public children: ReviewNode[] | undefined;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'file' | 'folder',
        public readonly filePath?: string // Only for files
    ) {
        super(label, collapsibleState);

        if (type === 'folder') {
            this.iconPath = vscode.ThemeIcon.Folder;
            this.contextValue = 'folder';
        } else {
            this.iconPath = vscode.ThemeIcon.File;
            this.contextValue = 'file';
            this.resourceUri = vscode.Uri.file(filePath!); // Helps with icon and labeling

            const session = ReviewSession.getInstance();
            if (session.baseSha && session.cwd && filePath) {
                const leftUri = vscode.Uri.parse(`${GitContentProvider.scheme}:/${filePath}?sha=${session.baseSha}`);
                const rightUri = vscode.Uri.file(`${session.cwd}/${filePath}`);

                this.command = {
                    command: 'vscode.diff',
                    title: 'Open Diff',
                    arguments: [leftUri, rightUri, `${path.basename(filePath)} (Review)`]
                };
            }
        }
    }
}
