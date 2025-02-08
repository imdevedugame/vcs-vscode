const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/** 
 * Contoh interface data versi:
 * {
 *   timestamp: string,
 *   fileName: string,
 *   content: string,
 *   format: string,
 *   isFavorite?: boolean,     // [Fitur #3 Favorite Versions]
 *   branch?: string           // [Fitur #6 Branching minimal]
 * }
 */

/** 
 * Timeline API (Fitur #5): kita buat provider minimal.
 * Agar muncul di "Timeline", daftarkan di 'package.json' -> contributes.timeline.
 */
class ImvanzTimelineProvider {
    // Menerima root storage (supaya bisa baca data history)
    constructor(storagePath) {
        this.storagePath = storagePath;
        this.onDidChange = new vscode.EventEmitter().event;
    }

    // Dipanggil VSCode saat timeline dibutuhkan
    async provideTimeline(uri, options, token) {
        // uri => file yang dibuka, kita cari riwayatnya
        const relativePath = path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, uri.fsPath);
        const sanitizedPath = relativePath.replace(/[\\/]/g, '_');
        const fileStoragePath = path.join(this.storagePath, `${sanitizedPath}.json`);
        let timelineItems = [];

        if (fs.existsSync(fileStoragePath)) {
            try {
                const history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
                timelineItems = history.map((entry, idx) => {
                    return {
                        timestamp: new Date(entry.timestamp).valueOf(),
                        label: `Versi ${idx + 1}`,
                        detail: `Saved at ${entry.timestamp}`,
                        // Command untuk terapkan versi
                        command: {
                            command: 'imvanz.applyHistory',
                            title: 'Apply this version',
                            arguments: [relativePath, idx]
                        }
                    };
                });
            } catch (err) {
                // ignore
            }
        }

        return {
            source: 'ImvanzTimeline',
            items: timelineItems
        };
    }
}

class HistoryProvider {
    constructor(storagePath) {
        this.storagePath = storagePath;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        // Ikon per ekstensi file (sekadar contoh)
        this.fileIcons = {
            js: new vscode.ThemeIcon('file-code'),
            ts: new vscode.ThemeIcon('file-code'),
            json: new vscode.ThemeIcon('file-code'),
            html: new vscode.ThemeIcon('file-code'),
            css: new vscode.ThemeIcon('file-code'),
            md: new vscode.ThemeIcon('markdown'),
            py: new vscode.ThemeIcon('file-code'),
            php: new vscode.ThemeIcon('file-code')
        };
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!element) {
            // List semua file .json di folder .imvanz
            return this.getAllHistoryFiles().map(file => {
                const relativePath = this.toRelativePath(file);
                const item = new vscode.TreeItem(relativePath, vscode.TreeItemCollapsibleState.Collapsed);
                item.contextValue = 'fileItem';

                // Tampilkan ikon sesuai ekstensi
                const fileExt = path.extname(relativePath).replace('.', '');
                if (this.fileIcons[fileExt]) {
                    item.iconPath = this.fileIcons[fileExt];
                } else {
                    item.iconPath = new vscode.ThemeIcon('file');
                }

                item.tooltip = `Riwayat untuk file: ${relativePath}`;
                item.description = `File type: ${fileExt || 'unknown'}`;
                return item;
            });
        } else {
            // List versi-versi untuk file yang dipilih
            return this.getFileHistory(element.label);
        }
    }

    getAllHistoryFiles() {
        return fs.readdirSync(this.storagePath).filter(file => file.endsWith('.json'));
    }

    toRelativePath(sanitizedPath) {
        return sanitizedPath
            .replace('.json', '')
            .replace(/_/g, path.sep);
    }

    sanitizePath(relativePath) {
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
                let branchName = entry.branch || 'main';
                const versionLabel = `Versi ${index + 1} (${branchName}): ${entry.timestamp}`;
                const versionItem = new vscode.TreeItem(versionLabel, vscode.TreeItemCollapsibleState.None);
                versionItem.contextValue = 'historyItem';
                versionItem.iconPath = new vscode.ThemeIcon('git-commit'); // ikon versi/commit

                // Tampilkan jika favorit
                if (entry.isFavorite) {
                    versionItem.label += ' ★';
                }

                versionItem.tooltip = `Klik untuk aksi: Apply, Preview, Delete, atau Compare.`;
                versionItem.description = `Saved at: ${entry.timestamp}`;

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
    // 1) Deteksi apakah Auto Save sedang aktif
    detectAutoSaveOnce(context);

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

    // Timeline (Fitur #5)


    // Register commands
    registerCommand(context, 'imvanz.init', () => {
        vscode.window.showInformationMessage('IM Init berhasil dijalankan.');
    });

    // Event OnSave => Simpan Riwayat (+ Auto-Prune Fitur #4)
    vscode.workspace.onDidSaveTextDocument(document => {
        saveHistory(document, rootPath, storagePath, historyProvider);
        autoPruneHistory(document, rootPath, storagePath, historyProvider);
    });

    // Aksi saat user pilih versi di TreeView
    registerCommand(context, 'imvanz.selectHistory', async(fileName, versionIndex) => {
        const pick = await vscode.window.showQuickPick([
            { label: 'Apply History', description: 'Menerapkan versi ini ke file asli' },
            { label: 'Preview History', description: 'Membuka versi ini sebagai preview (read-only)' },
            { label: 'Delete History', description: 'Menghapus versi riwayat ini' },
            { label: 'Compare History', description: 'Membandingkan versi ini dengan file di workspace' },
            { label: 'Favorite/Unfavorite', description: 'Tandai/tidak tandai versi ini sebagai favorit' },
            { label: 'Partial Revert', description: 'Pulihkan sebagian isi (baris tertentu) dari versi ini' },
            { label: 'Export Version', description: 'Ekspor versi ini ke file .patch (sinkronisasi manual)' },
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
            case 'Favorite/Unfavorite':
                toggleFavoriteVersion(fileName, versionIndex, storagePath, historyProvider);
                break;
            case 'Partial Revert':
                partialRevert(fileName, versionIndex, storagePath);
                break;
            case 'Export Version':
                exportVersion(fileName, versionIndex, storagePath);
                break;
            default:
                break;
        }
    });

    // Command manual
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

    // Menonaktifkan extension
    registerCommand(context, 'imvanz.disableExtension', async() => {
        const choice = await vscode.window.showWarningMessage(
            'Apakah Anda yakin ingin menonaktifkan VCS-VSCODE?', { modal: true },
            'Ya', 'Batal'
        );
        if (choice === 'Ya') {
            vscode.commands.executeCommand('workbench.extensions.disableExtension', 'Imvanz.VCS-VSCODE');
        }
    });

    // Fitur #2 Quick Diff => bandingkan isi file saat ini dengan versi terakhir
    registerCommand(context, 'imvanz.quickDiff', () => {
        quickDiffCurrentFile(storagePath, rootPath);
    });

    // Fitur #6: Membuat “branch” baru / restore ke branch
    registerCommand(context, 'imvanz.createBranch', () => {
        createNewBranch(rootPath, storagePath, historyProvider);
    });

    // Fitur #7: Import Versi
    registerCommand(context, 'imvanz.importVersion', () => {
        importVersion(rootPath, storagePath, historyProvider);
    });

    // Fitur #9: Full-Text Search di semua versi
    registerCommand(context, 'imvanz.searchInHistory', () => {
        searchInHistory(rootPath, storagePath);
    });

    // Fitur #10: Custom Panel (Webview) menampilkan ringkasan versi
    registerCommand(context, 'imvanz.showChangelog', () => {
        showChangelogPanel(storagePath);
    });
}

/**
 * Fitur #4: Auto-prune
 *  - Contoh: simpan max 5 versi, hapus sisanya
 *  - Atau bisa pakai setting: let maxHistory = config.get('maxHistory', 10);
 */
function autoPruneHistory(document, rootPath, storagePath, historyProvider) {
    const relativePath = path.relative(rootPath, document.uri.fsPath);
    const sanitizedPath = relativePath.replace(/[\\/]/g, '_');
    const fileStoragePath = path.join(storagePath, `${sanitizedPath}.json`);

    let maxHistory = 5; // misal hanya simpan 5 versi
    if (!fs.existsSync(fileStoragePath)) return;

    try {
        let history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
        if (history.length > maxHistory) {
            const sliced = history.slice(history.length - maxHistory);
            fs.writeFileSync(fileStoragePath, JSON.stringify(sliced, null, 2));
            historyProvider.refresh();
        }
    } catch (error) {
        console.error('autoPruneHistory error:', error);
    }
}

/**
 * Fitur #3: Toggle Favorite
 */
function toggleFavoriteVersion(fileName, versionIndex, storagePath, historyProvider) {
    const sanitizedPath = fileName.replace(/[\\/]/g, '_');
    const filePath = path.join(storagePath, `${sanitizedPath}.json`);
    if (!fs.existsSync(filePath)) return;
    try {
        let history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const version = history[versionIndex];
        version.isFavorite = !version.isFavorite; // toggle
        fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
        vscode.window.showInformationMessage(
            `Versi ke-${versionIndex + 1} sekarang ${version.isFavorite ? 'menjadi favorit' : 'tidak favorit'}`
        );
        historyProvider.refresh();
    } catch (error) {
        vscode.window.showErrorMessage('Gagal toggle favorite: ' + error.message);
    }
}

/**
 * Fitur #1: Partial Revert (sangat sederhana)
 *  - Buka diff, lalu user copy-paste manual (contoh minimal).
 */
async function partialRevert(fileName, versionIndex, storagePath) {
    try {
        const rootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const sanitizedPath = fileName.replace(/[\\/]/g, '_');
        const filePath = path.join(storagePath, `${sanitizedPath}.json`);
        const targetFilePath = path.join(rootFolder, fileName);

        if (!fs.existsSync(targetFilePath)) {
            vscode.window.showErrorMessage('File asli tidak ditemukan: ' + fileName);
            return;
        }

        const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const selectedVersion = history[versionIndex];
        if (!selectedVersion) {
            vscode.window.showErrorMessage(`Versi ${versionIndex + 1} tidak ditemukan`);
            return;
        }

        // Buka compare (diff) di “untitled:partial-revert”
        const tempUri = vscode.Uri.parse(`untitled:${fileName}-partial-revert`);
        const doc = await vscode.workspace.openTextDocument(tempUri);
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(0, 0, doc.lineCount, 0);
        edit.replace(tempUri, fullRange, selectedVersion.content);
        await vscode.workspace.applyEdit(edit);

        // Tampilkan diff. Di sinilah user bisa menyalin baris tertentu.
        vscode.commands.executeCommand(
            'vscode.diff',
            tempUri,
            vscode.Uri.file(targetFilePath),
            `Partial Revert: ${fileName} (Versi ${versionIndex + 1})`
        );
    } catch (err) {
        vscode.window.showErrorMessage('Gagal partial revert: ' + err.message);
    }
}

/**
 * Fitur #7: Export versi ke file .patch (atau .txt) agar bisa dipindah ke folder lain
 */
function exportVersion(fileName, versionIndex, storagePath) {
    vscode.window.showSaveDialog({
        filters: { 'Patch Files': ['patch', 'txt'] },
        saveLabel: 'Simpan Versi Sebagai'
    }).then(saveUri => {
        if (!saveUri) return;
        const sanitizedPath = fileName.replace(/[\\/]/g, '_');
        const filePath = path.join(storagePath, `${sanitizedPath}.json`);
        try {
            const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const selectedVersion = history[versionIndex];
            if (!selectedVersion) return;
            fs.writeFileSync(saveUri.fsPath, selectedVersion.content, 'utf8');
            vscode.window.showInformationMessage(`Versi diekspor ke: ${saveUri.fsPath}`);
        } catch (err) {
            vscode.window.showErrorMessage('Gagal ekspor versi: ' + err.message);
        }
    });
}

/**
 * Fitur #7 (lanjutan): Import versi (dari .patch atau .txt)
 *  - Menambahkan versi baru dengan konten dari file .patch.
 */
function importVersion(rootPath, storagePath, historyProvider) {
    vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Patch Files': ['patch', 'txt'] },
        openLabel: 'Pilih File Patch'
    }).then(async(fileUri) => {
        if (!fileUri || fileUri.length === 0) return;

        // Tanyakan user: untuk file mana patch ini mau ditambahkan
        const filePick = await vscode.window.showInputBox({
            prompt: 'Masukkan path relatif file yang mau ditambah versi ini (misal: src/index.js)'
        });
        if (!filePick) return;

        // Baca patch content
        const patchContent = fs.readFileSync(fileUri[0].fsPath, 'utf8');
        const sanitizedPath = filePick.replace(/[\\/]/g, '_');
        const fileStoragePath = path.join(storagePath, `${sanitizedPath}.json`);

        let history = [];
        if (fs.existsSync(fileStoragePath)) {
            try {
                history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
            } catch (err) {}
        }

        // Tambahkan versi baru
        history.push({
            timestamp: new Date().toISOString(),
            fileName: filePick,
            content: patchContent,
            format: path.extname(filePick).slice(1)
        });

        fs.writeFileSync(fileStoragePath, JSON.stringify(history, null, 2));
        vscode.window.showInformationMessage('Berhasil import versi baru dari patch!');
        historyProvider.refresh();
    });
}

/**
 * Fitur #2: Quick Diff => bandingkan isi file yang sedang terbuka 
 * dengan versi terakhir di riwayat (jika ada).
 */
async function quickDiffCurrentFile(storagePath, rootPath) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('Tidak ada file yang terbuka.');
        return;
    }
    const doc = editor.document;
    const relativePath = path.relative(rootPath, doc.uri.fsPath);
    const sanitizedPath = relativePath.replace(/[\\/]/g, '_');
    const fileStoragePath = path.join(storagePath, `${sanitizedPath}.json`);

    if (!fs.existsSync(fileStoragePath)) {
        vscode.window.showWarningMessage('Belum ada riwayat untuk file ini.');
        return;
    }

    try {
        const history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
        const lastVersion = history[history.length - 1];
        if (!lastVersion) {
            vscode.window.showWarningMessage('Riwayat kosong.');
            return;
        }

        // Buat dokumen sementara
        const tempUri = vscode.Uri.parse(`untitled:${relativePath}-quick-diff`);
        const tempDoc = await vscode.workspace.openTextDocument(tempUri);
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(0, 0, tempDoc.lineCount, 0);
        edit.replace(tempUri, fullRange, lastVersion.content);
        await vscode.workspace.applyEdit(edit);

        // Lakukan diff
        vscode.commands.executeCommand(
            'vscode.diff',
            tempUri,
            doc.uri,
            `Quick Diff: ${relativePath} (Last Version) ↔ Current`
        );
    } catch (err) {
        vscode.window.showErrorMessage('quickDiff error: ' + err.message);
    }
}

/**
 * Fitur #6: Simulasi “branching”
 *  - Meminta user nama branch, lalu menambahkan entri versi "kosong" 
 *    agar tampak seolah berganti branch.
 */
async function createNewBranch(rootPath, storagePath, historyProvider) {
    const branchName = await vscode.window.showInputBox({ prompt: 'Masukkan nama branch baru' });
    if (!branchName) return;

    // Tanyakan file mana yang mau “dipindahkan” ke branch
    const filePick = await vscode.window.showQuickPick(getAllFilesInWorkspace(rootPath), { placeHolder: 'Pilih file yang akan di-branch' });
    if (!filePick) return;

    // Kita tambahkan entri dummy di JSON, menandakan “branch switch”
    const sanitizedPath = filePick.replace(/[\\/]/g, '_');
    const fileStoragePath = path.join(storagePath, `${sanitizedPath}.json`);

    let history = [];
    if (fs.existsSync(fileStoragePath)) {
        try {
            history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
        } catch (err) {}
    }

    history.push({
        timestamp: new Date().toISOString(),
        fileName: filePick,
        content: '', // misalnya kosong, atau copy dari versi terakhir
        format: path.extname(filePick).slice(1),
        branch: branchName
    });

    fs.writeFileSync(fileStoragePath, JSON.stringify(history, null, 2));
    vscode.window.showInformationMessage(`Branch "${branchName}" dibuat untuk file: ${filePick}`);
    historyProvider.refresh();
}

/**
 * Helper: Mendapatkan daftar file di workspace (sederhana).
 */
function getAllFilesInWorkspace(rootPath) {
    // Contoh minimal: men-scan folder secara rekursif => bisa cukup besar
    // Untuk demo, kita kembalikan array statis atau pun cari .js saja
    let results = [];

    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else {
                const rel = path.relative(rootPath, fullPath);
                results.push(rel);
            }
        }
    }
    scanDir(rootPath);
    return results;
}

/**
 * Fitur #9: Full-text search ke semua versi (seluruh .imvanz).
 *  - Demo minimal: Tampilkan hasil di QuickPick.
 */
async function searchInHistory(rootPath, storagePath) {
    const query = await vscode.window.showInputBox({ placeHolder: 'Masukkan kata kunci' });
    if (!query) return;

    const allFiles = fs.readdirSync(storagePath).filter(f => f.endsWith('.json'));
    let results = [];

    for (const file of allFiles) {
        const filePath = path.join(storagePath, file);
        try {
            const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            history.forEach((ver, idx) => {
                if (ver.content.includes(query)) {
                    results.push({
                        label: `${file.replace('.json', '')} [Versi ${idx + 1}]`,
                        description: `Mengandung "${query}"`,
                        file,
                        idx
                    });
                }
            });
        } catch (err) {
            // ignore error parse
        }
    }

    if (results.length === 0) {
        vscode.window.showInformationMessage('Tidak ditemukan matching text di riwayat manapun.');
        return;
    }

    const pick = await vscode.window.showQuickPick(results, { placeHolder: 'Hasil Pencarian' });
    if (!pick) return;

    // Arahkan user ke Compare misalnya
    const sanitizedPath = pick.file; // ex: "src_index.js.json"
    const relFile = sanitizedPath.replace('.json', '').replace(/_/g, path.sep);
    compareHistory(relFile, pick.idx, storagePath, rootPath);
}

/**
 * Fitur #10: Custom Panel (Webview) menampilkan ringkasan versi
 */
function showChangelogPanel(storagePath) {
    const panel = vscode.window.createWebviewPanel(
        'imvanzChangelog',
        'IMVanz Changelog',
        vscode.ViewColumn.One, {}
    );

    // Buat ringkasan versi semua file (sederhana)
    let html = `<h1>IMVanz Local Versioning Changelog</h1>`;
    const allFiles = fs.readdirSync(storagePath).filter(f => f.endsWith('.json'));

    for (const file of allFiles) {
        let history;
        try {
            history = JSON.parse(fs.readFileSync(path.join(storagePath, file), 'utf8'));
        } catch (err) {
            continue;
        }
        html += `<h2>${file}</h2>`;
        html += `<ul>`;
        for (let i = 0; i < history.length; i++) {
            html += `<li>Versi ${i + 1}, ${history[i].timestamp}, 
                    Branch: ${history[i].branch || 'main'} 
                    ${history[i].isFavorite ? '★' : ''}</li>`;
        }
        html += `</ul>`;
    }

    panel.webview.html = html;
}

/**
 * Menunjukkan peringatan 1x jika autoSave aktif.
 */
function detectAutoSaveOnce(context) {
    const autoSave = vscode.workspace.getConfiguration('files').get('autoSave');
    const isAutoSaveOn = autoSave && autoSave !== 'off';
    const hasWarned = context.globalState.get('warnedAutoSave', false);

    if (isAutoSaveOn && !hasWarned) {
        vscode.window.showWarningMessage(
            `Fitur Auto Save terdeteksi aktif. Rekomendasi: matikan Auto Save agar pencatatan riwayat lebih efisien.`
        );
        context.globalState.update('warnedAutoSave', true);
    }
}

function registerCommand(context, command, callback) {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
}

/**
 * Menyimpan riwayat setiap kali file di-save.
 */
function saveHistory(document, rootPath, storagePath, historyProvider) {
    const filePath = document.uri.fsPath;
    const relativePath = path.relative(rootPath, filePath);
    const sanitizedPath = relativePath.replace(/[\\/]/g, '_');
    const fileStoragePath = path.join(storagePath, `${sanitizedPath}.json`);

    let history = [];
    if (fs.existsSync(fileStoragePath)) {
        try {
            history = JSON.parse(fs.readFileSync(fileStoragePath, 'utf8'));
        } catch (e) {
            console.error('Gagal parse JSON lama:', e);
        }
    }

    history.push({
        timestamp: new Date().toISOString(),
        fileName: relativePath,
        content: document.getText(),
        format: path.extname(relativePath).slice(1)
            // branch: 'main' // opsional, kalau mau default
    });

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
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage('Parameter tidak valid untuk menerapkan riwayat.');
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Apakah Anda yakin ingin menimpa isi file "${fileName}" dengan versi ke-${versionIndex + 1}?`, { modal: true },
        'Ya',
        'Batal'
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

        const rootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const targetFilePath = path.join(rootFolder, fileName);

        if (!fs.existsSync(targetFilePath)) {
            vscode.window.showErrorMessage(`File asli tidak ditemukan: ${fileName}`);
            return;
        }

        const doc = await vscode.workspace.openTextDocument(targetFilePath);
        const editor = await vscode.window.showTextDocument(doc);

        const fullRange = new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(doc.getText().length)
        );

        await editor.edit(editBuilder => {
            editBuilder.replace(fullRange, selectedVersion.content);
        });

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
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage('Parameter tidak valid untuk menghapus riwayat.');
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Yakin ingin menghapus versi ke-${versionIndex + 1} dari file "${fileName}"?`, { modal: true },
        'Ya',
        'Batal'
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
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage('Parameter tidak valid untuk melihat pratinjau riwayat.');
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
            vscode.window.showTextDocument(doc, { preview: true });
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Gagal membuka pratinjau riwayat: ${error.message}`);
    }
}

/**
 * Membandingkan versi ke versionIndex dengan file di workspace (offline).
 */
async function compareHistory(fileName, versionIndex, storagePath, rootPath) {
    if (!fileName || typeof versionIndex !== 'number') {
        vscode.window.showErrorMessage('Parameter tidak valid untuk membandingkan riwayat.');
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

        const tempUri = vscode.Uri.parse(`untitled:${fileName}-version-${versionIndex + 1}`);
        const doc = await vscode.workspace.openTextDocument(tempUri);

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(0, 0, doc.lineCount, 0);
        edit.replace(tempUri, fullRange, selectedVersion.content);
        await vscode.workspace.applyEdit(edit);

        await vscode.commands.executeCommand(
            'vscode.diff',
            tempUri,
            vscode.Uri.file(targetFilePath),
            `Compare: ${fileName} (Versi ${versionIndex + 1}) ↔ Current`
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