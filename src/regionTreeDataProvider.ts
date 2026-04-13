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

		// Find the closest region at or before the cursor line (binary search)
		let lo = 0, hi = this.data.length - 1;
		let closestRegion: RegionItem | undefined;
		while (lo <= hi) {
			const mid = (lo + hi) >>> 1;
			if (this.data[mid].line <= lineNumber) {
				closestRegion = this.data[mid];
				lo = mid + 1;
			} else {
				hi = mid - 1;
			}
		}
		// set to [0] if no region is before the cursor line, otherwise the closest region found
		if (!closestRegion) {
			closestRegion = this.data[0];
		}
		// console.log('Closest region for line', lineNumber, 'is', closestRegion?.label, 'at line', closestRegion?.line);
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