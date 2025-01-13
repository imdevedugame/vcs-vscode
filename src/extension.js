// extension.js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class HistoryProvider {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!element) {
            // Tampilkan file dengan riwayat
            const files = fs.readdirSync(this.storagePath).filter(file => file.endsWith('.json'));
            return files.map(file => {
                const fileName = file.replace('.json', '');
                return new vscode.TreeItem(fileName, vscode.TreeItemCollapsibleState.Collapsed);
            });
        } else {
            // Tampilkan perubahan di dalam file
            const filePath = path.join(this.storagePath, `${element.label}.json`);
            const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return history.map((entry, index) => {
                const item = new vscode.TreeItem(`Versi ${index + 1}: ${entry.timestamp}`);
                item.contextValue = 'historyItem';
                item.command = {
                    command: 'imvanz.applyHistory',
                    title: 'Apply History',
                    arguments: [element.label, index]
                };
                return item;
            });
        }
    }
}

/**
 * Aktivasi ekstensi
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    const storageFolderName = '.imvanz';

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Tidak ada folder terbuka di workspace.');
        return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const storagePath = path.join(rootPath, storageFolderName);

    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath);

    const historyProvider = new HistoryProvider(storagePath);
    vscode.window.createTreeView('imvanzHistory', {
        treeDataProvider: historyProvider
    });
    const registerCommand = (context, command, callback) => {
        const disposable = vscode.commands.registerCommand(command, callback);
        context.subscriptions.push(disposable);
    };

    registerCommand(context, 'imvanz.init', () => {
        console.log('Perintah IM Init dijalankan.');
        vscode.window.showInformationMessage('IM Init berhasil dijalankan.');
    });

    // Event listener untuk menyimpan riwayat setiap kali file disimpan
    vscode.workspace.onDidSaveTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const relativePath = path.relative(rootPath, filePath);
        const fileStoragePath = path.join(storagePath, `${relativePath}.json`);

        const history = fs.existsSync(fileStoragePath) ?
            JSON.parse(fs.readFileSync(fileStoragePath, 'utf8')) : [];

        history.push({
            timestamp: new Date().toISOString(),
            fileName: relativePath,
            content: document.getText(),
            format: path.extname(relativePath).slice(1)
        });

        fs.writeFileSync(fileStoragePath, JSON.stringify(history, null, 2));
        vscode.window.showInformationMessage(`Riwayat disimpan untuk file: ${relativePath}`);
        historyProvider.refresh();
    });

    // Perintah untuk apply history
    const applyHistoryCommand = vscode.commands.registerCommand('imvanz.applyHistory', (fileName, versionIndex) => {
        const filePath = path.join(storagePath, `${fileName}.json`);
        const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const selectedVersion = history[versionIndex];

        vscode.workspace.openTextDocument({
            content: selectedVersion.content,
            language: selectedVersion.format
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    });

    // Perintah untuk menghapus riwayat
    const deleteHistoryCommand = vscode.commands.registerCommand('imvanz.deleteHistory', (fileName) => {
        const filePath = path.join(storagePath, `${fileName}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            vscode.window.showInformationMessage(`Riwayat untuk file ${fileName} berhasil dihapus.`);
            historyProvider.refresh();
        }
    });

    context.subscriptions.push(applyHistoryCommand, deleteHistoryCommand);
}

/**
 * Menonaktifkan ekstensi
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};