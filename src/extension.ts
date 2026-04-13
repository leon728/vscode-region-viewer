import * as vscode from 'vscode';
import { RegionTreeDataProvider } from './regionTreeDataProvider';
import { RegionDecorator } from './regionDecorator';

/** Center line of the primary vertical viewport (first visible range). */
function getCenterVisibleLine(visibleRanges: readonly vscode.Range[]): number | undefined {
	if (visibleRanges.length === 0) {
		return undefined;
	}
	const r = visibleRanges[0];
	const top = r.start.line;
	// Range end is typically exclusive at column 0 on the line after the last visible line.
	let bottom = r.end.line;
	if (r.end.character === 0 && bottom > top) {
		bottom -= 1;
	}
	return Math.floor((top + bottom) / 2);
}

export function activate(context: vscode.ExtensionContext) {
	const regionTreeDataProvider = new RegionTreeDataProvider();
	const regionDecorator = new RegionDecorator();

	// console.log('>> Region Viewer extension is now active!');
	// vscode.window.showInformationMessage('Region Viewer Extension Loaded!');

	// Create TreeView to enable reveal functionality
	const treeView = vscode.window.createTreeView('regionViewer', {
		treeDataProvider: regionTreeDataProvider,
		showCollapseAll: false
	});

	context.subscriptions.push(
		treeView,
		regionDecorator
	);

	// Unified update function
	const updateAll = () => {
		regionTreeDataProvider.refresh();
		regionDecorator.updateDecorations();
	};

	// View title menu uses custom context keys (not config.*) so checked state updates
	// when settings change from anywhere (Settings UI, JSON, or our toggle commands).
	const syncRegionViewerMenuContext = () => {
		const config = vscode.workspace.getConfiguration('region-viewer');
		void vscode.commands.executeCommand(
			'setContext',
			'regionViewer.followCursor',
			config.get<boolean>('followCursor', true)
		);
		void vscode.commands.executeCommand(
			'setContext',
			'regionViewer.showDecorations',
			config.get<boolean>('showDecorations', true)
		);
	};

	// Initialize on activation
	updateAll();
	syncRegionViewerMenuContext();

	// Follow cursor: reveal the closest region in tree view when cursor moves or viewport scrolls
	const followCursor = (referenceLine?: number) => {
		// Check if follow cursor is enabled
		const followCursorEnabled = vscode.workspace.getConfiguration('region-viewer').get<boolean>('followCursor', true);
		if (!followCursorEnabled) return;

		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		// Do not call reveal when the view is hidden — reveal would show/focus the tree view.
		if (!treeView.visible) return;

		const line = referenceLine ?? editor.selection.active.line;
		const closestRegion = regionTreeDataProvider.findClosestRegion(line);
		
		if (closestRegion) {
			// Reveal with expand to ensure visibility
			treeView.reveal(closestRegion, { select: true, focus: false, expand: true }).then(
				() => { console.log('Reveal succeeded'); },
				(error) => { console.log('Reveal failed:', error); }
			);
		}
	};

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
	let followCursorTimeout: NodeJS.Timeout | undefined;
	let visibleRangesFollowTimeout: NodeJS.Timeout | undefined;
	/** Skip viewport-based follow briefly after a selection change so auto-scroll does not override cursor. */
	let lastSelectionChangeAt = 0;

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(() => {
			updateAll();
			// Delay follow cursor to ensure tree is refreshed
			setTimeout(followCursor, 50);
		}),
		
		vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document !== vscode.window.activeTextEditor?.document) return;
			
			if (refreshTimeout) {
				clearTimeout(refreshTimeout);
			}
			refreshTimeout = setTimeout(() => {
				updateAll();
				// Delay follow cursor to ensure tree is refreshed
				setTimeout(followCursor, 50);
				refreshTimeout = undefined;
			}, 300);
		}),

		// Follow cursor when selection changes
		vscode.window.onDidChangeTextEditorSelection((e) => {
			if (e.textEditor !== vscode.window.activeTextEditor) return;

			lastSelectionChangeAt = Date.now();

			// Debounce to avoid excessive updates
			if (followCursorTimeout) {
				clearTimeout(followCursorTimeout);
			}
			followCursorTimeout = setTimeout(() => {
				followCursor();
				followCursorTimeout = undefined;
			}, 150);
		}),

		// When the viewport scrolls, follow the region closest to the center visible line
		vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
			if (e.textEditor !== vscode.window.activeTextEditor) return;

			if (Date.now() - lastSelectionChangeAt < 120) {
				return;
			}

			if (visibleRangesFollowTimeout) {
				clearTimeout(visibleRangesFollowTimeout);
			}
			visibleRangesFollowTimeout = setTimeout(() => {
				const editor = vscode.window.activeTextEditor;
				if (!editor || editor !== e.textEditor) {
					visibleRangesFollowTimeout = undefined;
					return;
				}
				const centerLine = getCenterVisibleLine(editor.visibleRanges);
				if (centerLine === undefined) {
					visibleRangesFollowTimeout = undefined;
					return;
				}
				followCursor(centerLine);
				visibleRangesFollowTimeout = undefined;
			}, 150);
		}),

		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('region-viewer')) {
				syncRegionViewerMenuContext();
				// Rebuild decoration types and re-apply to visible editors. Rely on the
				// whole section so nested "colors" updates always fire (some VS Code versions
				// do not match affectsConfiguration('region-viewer.colors') reliably).
				regionDecorator.refreshColors();
			}
		})
	);

	// Toggle follow cursor setting
	const toggleFollowCursor = () => {
		const config = vscode.workspace.getConfiguration('region-viewer');
		const newValue = !config.get<boolean>('followCursor', true);
		config.update('followCursor', newValue, vscode.ConfigurationTarget.Global);
	};

	// Toggle show decorations setting
	const toggleShowDecorations = () => {
		const config = vscode.workspace.getConfiguration('region-viewer');
		const newValue = !config.get<boolean>('showDecorations', true);
		void config
			.update('showDecorations', newValue, vscode.ConfigurationTarget.Global)
			.then(() => regionDecorator.updateDecorations());
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('region-viewer.followCursor.on', toggleFollowCursor),
		vscode.commands.registerCommand('region-viewer.followCursor.off', toggleFollowCursor),
		vscode.commands.registerCommand('region-viewer.showDecorations.on', toggleShowDecorations),
		vscode.commands.registerCommand('region-viewer.showDecorations.off', toggleShowDecorations)
	);

	// Show active document language ID
	context.subscriptions.push(vscode.commands.registerCommand('region-viewer.activeDocumentLanguageId', () => {
		const languageId = vscode.window.activeTextEditor?.document?.languageId ?? 'Unknown language';
		vscode.window.showInformationMessage(`Language ID for active document: ${languageId}`);
	}));
}

export function deactivate() {}
