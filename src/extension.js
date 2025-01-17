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
            // List semua file yang punya riwayat .json di folder .imvanz
            return this.getAllHistoryFiles().map(file => {
                const relativePath = this.toRelativePath(file);
                const item = new vscode.TreeItem(relativePath, vscode.TreeItemCollapsibleState.Collapsed);
                item.contextValue = 'fileItem';
                return item;
            });
        } else {
            // List versi-versi untuk file yang dipilih
            return this.getFileHistory(element.label);
        }
    }

    getAllHistoryFiles() {
        // Ambil semua file .json di folder penyimpanan
        return fs.readdirSync(this.storagePath).filter(file => file.endsWith('.json'));
    }

    toRelativePath(sanitizedPath) {
        // file: folder_subfolder_namafile.js.json => folder/subfolder/namafile.js
        return sanitizedPath
            .replace('.json', '')
            .replace(/_/g, path.sep);
    }

    sanitizePath(relativePath) {
        // ubah slash / atau \ menjadi '_'
        return relativePath.replace(/[\\/]/g, '_');
    }

    getFileHistory(fileName) {
        const sanitizedPath = this.sanitizePath(fileName);
        const filePath = path.join(this.storagePath, `${sanitizedPath}.json`);
        try {
            const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (!history || history.length === 0) {
                vscode.window.showWarningMessage(`Riwayat kosong untuk file: ${fileName}`);
                return [];
            }

            return history.map((entry, index) => {
                const versionLabel = `Versi ${index + 1}: ${entry.timestamp}`;
                const versionItem = new vscode.TreeItem(versionLabel, vscode.TreeItemCollapsibleState.None);
                versionItem.contextValue = 'historyItem';
                // simpan detail yang diperlukan di TreeItem
                versionItem.command = {
                    command: 'imvanz.selectHistory',
                    title: 'Pilih Riwayat',
                    arguments: [fileName, index]
                };
                return versionItem;
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Gagal membaca riwayat: ${error.message}`);
            return [];
        }
    }
}

function activate(context) {
    const storageFolderName = '.imvanz';

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Tidak ada folder terbuka di workspace.');
        return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const storagePath = path.join(rootPath, storageFolderName);

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    const historyProvider = new HistoryProvider(storagePath);
    vscode.window.createTreeView('imvanzHistory', {
        treeDataProvider: historyProvider
    });

    // Register semua commands
    registerCommand(context, 'imvanz.init', () => {
        vscode.window.showInformationMessage('IM Init berhasil dijalankan.');
    });

    // Saat file disimpan, simpan riwayat
    vscode.workspace.onDidSaveTextDocument(document => {
        saveHistory(document, rootPath, storagePath, historyProvider);
    });

    // Command untuk menampilkan menu apply/delete/preview/compare
    // Dipicu saat user klik child item (Versi Riwayat) di tree
    registerCommand(context, 'imvanz.selectHistory', async(fileName, versionIndex) => {
        const pick = await vscode.window.showQuickPick([
            { label: 'Apply History', description: 'Menerapkan versi ini ke file asli' },
            { label: 'Preview History', description: 'Membuka versi ini sebagai preview (read-only)' },
            { label: 'Delete History', description: 'Menghapus versi riwayat ini' },
            { label: 'Compare History', description: 'Membandingkan versi ini dengan file di workspace' },
            { label: 'Batal', description: 'Keluar tanpa melakukan apa pun' }
        ], { placeHolder: 'Pilih aksi' });

        if (!pick || pick.label === 'Batal') {
            return;
        }

        switch (pick.label) {
            case 'Apply History':
                applyHistory(fileName, versionIndex, storagePath);
                break;
            case 'Preview History':
                previewHistory(fileName, versionIndex, storagePath);
                break;
            case 'Delete History':
                deleteHistory(fileName, versionIndex, storagePath, historyProvider);
                break;
            case 'Compare History':
                compareHistory(fileName, versionIndex, storagePath, rootPath);
                break;
            default:
                break;
        }
    });

    // Command manual (jika mau panggil tanpa quickPick)
    registerCommand(context, 'imvanz.applyHistory', (fileName, versionIndex) => {
        applyHistory(fileName, versionIndex, storagePath);
    });

    registerCommand(context, 'imvanz.deleteHistory', (fileName, versionIndex) => {
        deleteHistory(fileName, versionIndex, storagePath, historyProvider);
    });

    registerCommand(context, 'imvanz.previewHistory', (fileName, versionIndex) => {
        previewHistory(fileName, versionIndex, storagePath);
    });

    registerCommand(context, 'imvanz.compareHistory', (fileName, versionIndex) => {
        compareHistory(fileName, versionIndex, storagePath, rootPath);
    });
}

function registerCommand(context, command, callback) {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
}

/**
 * Menyimpan riwayat setiap kali file di-save.
 */
function saveHistory(document, rootPath, storagePath, historyProvider) {
    // path file di komputer
    const filePath = document.uri.fsPath;
    // relatif ke root workspace
    const relativePath = path.relative(rootPath, filePath);
    // untuk penamaan .json
    const sanitizedPath = relativePath.replace(/[\\/]/g, '_');
    const fileStoragePath = path.join(storagePath, `${sanitizedPath}.json`);

    // Baca history lama jika ada
    let history = [];
    if (fs.existsSync(fileStoragePath)) {
        try {
            history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
        } catch (e) {
            console.error('Gagal parse JSON lama:', e);
        }
    }

    // Tambahkan entri baru
    history.push({
        timestamp: new Date().toISOString(),
        fileName: relativePath,
        content: document.getText(),
        format: path.extname(relativePath).slice(1) // ekstensi file (tanpa titik)
    });

    // Tulis file JSON
    try {
        fs.writeFileSync(fileStoragePath, JSON.stringify(history, null, 2));
        vscode.window.showInformationMessage(`Riwayat disimpan untuk file: ${relativePath}`);
        historyProvider.refresh();
    } catch (error) {
        vscode.window.showErrorMessage(`Gagal menyimpan riwayat: ${error.message}`);
    }
}

/**
 * Menerapkan isi versionIndex ke file aslinya di workspace.
 */
async function applyHistory(fileName, versionIndex, storagePath) {
    console.log('applyHistory called with:', { fileName, versionIndex });

    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage("Parameter tidak valid untuk menerapkan riwayat.");
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Apakah Anda yakin ingin menimpa isi file "${fileName}" dengan versi ke-${versionIndex + 1}?`, { modal: true },
        'Ya', 'Batal'
    );
    if (confirm !== 'Ya') {
        return;
    }

    const sanitizedPath = fileName.replace(/[\\/]/g, '_');
    const jsonFilePath = path.join(storagePath, `${sanitizedPath}.json`);

    try {
        const history = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        const selectedVersion = history[versionIndex];

        if (!selectedVersion) {
            vscode.window.showErrorMessage(`Versi riwayat tidak ditemukan untuk indeks: ${versionIndex}`);
            return;
        }

        // Buka file aslinya di editor
        const rootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const targetFilePath = path.join(rootFolder, fileName);

        if (!fs.existsSync(targetFilePath)) {
            vscode.window.showErrorMessage(`File asli tidak ditemukan: ${fileName}`);
            return;
        }

        const doc = await vscode.workspace.openTextDocument(targetFilePath);
        const editor = await vscode.window.showTextDocument(doc);

        // Replace seluruh isi file dengan versi riwayat
        const fullRange = new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(doc.getText().length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, selectedVersion.content);
        });

        // Optional: simpan otomatis
        await doc.save();

        vscode.window.showInformationMessage(`Berhasil menerapkan versi ke-${versionIndex + 1} pada file: ${fileName}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Gagal menerapkan riwayat: ${error.message}`);
    }
}

/**
 * Menghapus entri versi ke versionIndex dari fileName.
 */
async function deleteHistory(fileName, versionIndex, storagePath, historyProvider) {
    console.log('deleteHistory called with:', { fileName, versionIndex });
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage("Parameter tidak valid untuk menghapus riwayat.");
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Yakin ingin menghapus versi ke-${versionIndex + 1} dari file "${fileName}"?`, { modal: true },
        'Ya', 'Batal'
    );
    if (confirm !== 'Ya') {
        return;
    }

    const sanitizedPath = fileName.replace(/[\\/]/g, '_');
    const filePath = path.join(storagePath, `${sanitizedPath}.json`);
    try {
        const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!history[versionIndex]) {
            vscode.window.showErrorMessage(`Riwayat versi ${versionIndex + 1} tidak ditemukan.`);
            return;
        }

        history.splice(versionIndex, 1);
        fs.writeFileSync(filePath, JSON.stringify(history, null, 2));

        vscode.window.showInformationMessage(`Riwayat versi ${versionIndex + 1} berhasil dihapus.`);
        historyProvider.refresh();
    } catch (error) {
        vscode.window.showErrorMessage(`Gagal menghapus riwayat: ${error.message}`);
    }
}

/**
 * Membuka pratinjau versi ke versionIndex di editor (read-only).
 */
function previewHistory(fileName, versionIndex, storagePath) {
    console.log('previewHistory called with:', { fileName, versionIndex });
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage("Parameter tidak valid untuk melihat pratinjau riwayat.");
        return;
    }

    const sanitizedPath = fileName.replace(/[\\/]/g, '_');
    const filePath = path.join(storagePath, `${sanitizedPath}.json`);
    try {
        const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const selectedVersion = history[versionIndex];

        if (!selectedVersion) {
            vscode.window.showErrorMessage(`Versi riwayat tidak ditemukan: ${versionIndex}`);
            return;
        }

        vscode.workspace.openTextDocument({
            content: selectedVersion.content,
            language: selectedVersion.format
        }).then(doc => {
            // Buka sebagai preview
            vscode.window.showTextDocument(doc, { preview: true });
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Gagal membuka pratinjau riwayat: ${error.message}`);
    }
}

/**
 * Membandingkan versi ke versionIndex dengan file di workspace.
 */
async function compareHistory(fileName, versionIndex, storagePath, rootPath) {
    console.log('compareHistory called with:', { fileName, versionIndex });
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage("Parameter tidak valid untuk membandingkan riwayat.");
        return;
    }

    const sanitizedPath = fileName.replace(/[\\/]/g, '_');
    const jsonFilePath = path.join(storagePath, `${sanitizedPath}.json`);
    const targetFilePath = path.join(rootPath, fileName);

    if (!fs.existsSync(targetFilePath)) {
        vscode.window.showErrorMessage(`File asli tidak ditemukan: ${fileName}`);
        return;
    }

    try {
        const history = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        const selectedVersion = history[versionIndex];
        if (!selectedVersion) {
            vscode.window.showErrorMessage(`Versi riwayat tidak ditemukan: ${versionIndex}`);
            return;
        }

        // Buat dokumen sementara untuk versi riwayat
        // (kita bisa pakai scheme 'untitled' agar tidak menimpa file lain)
        const tempUri = vscode.Uri.parse(`untitled:${fileName}-version-${versionIndex+1}`);
        const doc = await vscode.workspace.openTextDocument(tempUri);

        // isi dokumen sementara
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(0, 0, doc.lineCount, 0);
        edit.replace(tempUri, fullRange, selectedVersion.content);
        await vscode.workspace.applyEdit(edit);

        // Gunakan perintah diff
        // arg1: uri doc versi lama, arg2: uri file asli, arg3: judul
        vscode.commands.executeCommand(
            'vscode.diff',
            tempUri,
            vscode.Uri.file(targetFilePath),
            `Compare: ${fileName} (Versi ${versionIndex+1}) ↔ Current`
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Gagal membandingkan riwayat: ${error.message}`);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};