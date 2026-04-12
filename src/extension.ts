import * as vscode from 'vscode';
import { RegionTreeDataProvider } from './regionTreeDataProvider';
import { RegionDecorator } from './regionDecorator';

export function activate(context: vscode.ExtensionContext) {
	const regionTreeDataProvider = new RegionTreeDataProvider();
	const regionDecorator = new RegionDecorator();

	// console.log('>> Region Viewer extension is now active!');
	// vscode.window.showInformationMessage('Region Viewer Extension Loaded!');

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('regionViewer', regionTreeDataProvider),
		regionDecorator
	);

	// Unified update function
	const updateAll = () => {
		regionTreeDataProvider.refresh();
		regionDecorator.updateDecorations();
	};

	// Initialize on activation
	updateAll();

	// If a TreeView item is selected, the cursor moves to that location.
	context.subscriptions.push(vscode.commands.registerCommand('region-viewer.reveal', (line) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;
		
		const pos = new vscode.Position(line, 0);
		editor.selection = new vscode.Selection(pos, pos);
		editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
	}));

	// Handle editor changes
	let refreshTimeout: NodeJS.Timeout | undefined;
	
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(() => {
			updateAll();
		}),
		
		vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document !== vscode.window.activeTextEditor?.document) return;
			
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
			}
			refreshTimeout = setTimeout(() => {
				updateAll();
				refreshTimeout = undefined;
			}, 300);
		}),

		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('region-viewer')) {
				regionDecorator.refreshColors();
				updateAll();
			}
		})
	);

	// Show active document language ID
	context.subscriptions.push(vscode.commands.registerCommand('region-viewer.activeDocumentLanguageId', () => {
		const languageId = vscode.window.activeTextEditor?.document?.languageId ?? 'Unknown language';
		vscode.window.showInformationMessage(`Language ID for active document: ${languageId}`);
	}));
}

export function deactivate() {}
