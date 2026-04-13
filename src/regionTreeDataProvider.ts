import * as vscode from 'vscode';
import { getStartPattern } from './utils';

export class RegionTreeDataProvider implements vscode.TreeDataProvider<RegionItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<RegionItem | undefined> = new vscode.EventEmitter<RegionItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<RegionItem | undefined> = this._onDidChangeTreeData.event;
	private data?: RegionItem[];

	// Find the closest region item for the given line number (searching upwards)
	findClosestRegion(lineNumber: number): RegionItem | undefined {
		if (!this.data || this.data.length === 0) {
			return undefined;
		}

		// Find the closest region at or before the cursor line
		let closestRegion: RegionItem | undefined;
		for (const region of this.data) {
			if (region.line <= lineNumber) {
				if (!closestRegion || region.line > closestRegion.line) {
					closestRegion = region;
				}
			}
		}
		return closestRegion;
	}

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

	getParent(element: RegionItem): RegionItem | undefined {
		// Flat list - no parent hierarchy
		return undefined;
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
	public readonly line: number;

	constructor(label: string, line: number) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.line = line;

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