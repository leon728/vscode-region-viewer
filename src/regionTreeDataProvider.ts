import * as vscode from 'vscode';
import { getStartPattern } from './utils';

export class RegionTreeDataProvider implements vscode.TreeDataProvider<RegionItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<RegionItem | undefined> = new vscode.EventEmitter<RegionItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<RegionItem | undefined> = this._onDidChangeTreeData.event;
	private data?: RegionItem[];

	refresh(): void {
		this.findRegions();
		this._onDidChangeTreeData.fire();
	}
  
	getTreeItem(element: RegionItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: RegionItem): RegionItem[] | undefined {
		return element ? undefined : this.data;
	}

	private findRegions(): void {
		const document = vscode.window.activeTextEditor?.document;
		if (!document) {
			this.data = undefined;
			return;
		}

		const startPattern = getStartPattern(document.languageId);
		if (!startPattern) {
			this.data = undefined;
			return;
		}

		const startRegExp = new RegExp(startPattern, 'g');
		const text = document.getText();
		const regions: RegionItem[] = [];
		let match;
		
		while ((match = startRegExp.exec(text))) {
			const startPos = document.positionAt(match.index);
			const name = match.groups?.name?.trim();
			// regions.push(new RegionItem(name ? "# " + name : "# region", startPos.line));
			regions.push(new RegionItem(name ? name : "region", startPos.line));
		}

		this.data = regions;
	}
}

class RegionItem extends vscode.TreeItem {

	constructor(label: string, line: number) {
		super(label, vscode.TreeItemCollapsibleState.None);

		this.tooltip = `Line ${line + 1}`;
		this.command = {
			title: '',
			command: 'region-viewer.reveal',
			arguments: [
				line
			]
		}
	}
}