const preview = document.getElementById('preview');

navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data === 'done') {
        preview.src = './files/index.html';
    }
});

let sw;

navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
    sw = reg.active || reg.installing || reg.waiting;
});

const files = document.getElementById('files');

async function* getFilesRecursively(entry, dir) {
    dir = dir === undefined ? '' : `${dir}/${entry.name}`;

    if (entry.kind === 'file') {
        const file = await entry.getFile();

        if (file !== null) {
            yield { path: dir, file };
        }
    } else if (entry.kind === 'directory') {
        for await (const handle of entry.values()) {
            yield* getFilesRecursively(handle, dir);
        }
    }
}

const filesBaseURL = `${window.location.origin}/files`;

let prevFiles = {};

async function readFiles(directoryHandle) {
    const updates = [];

    const currentFiles = {};

    for await (const { path, file } of getFilesRecursively(directoryHandle)) {
        currentFiles[filesBaseURL + path] = file;
    }

    for (const path of Object.keys(currentFiles)) {
        const file = currentFiles[path];

        if (prevFiles[path]) {
            if (prevFiles[path].lastModified !== file.lastModified) {
                updates.push({ type: "updated", path, file });
            }
        } else {
            updates.push({ type: "added", path, file });
        }
    }

    for (const path of Object.keys(prevFiles)) {
        if (!currentFiles[path]) {
            updates.push({ type: "deleted", path });
        }
    }

    if (updates.length > 0) {
        console.log(updates);
        sw.postMessage(updates);
    }

    prevFiles = currentFiles;
}

let timer = null;

files.addEventListener('click', async (event) => {
    const directoryHandle = await window.showDirectoryPicker();

    if (timer) {
        clearInterval(timer);
    }

    readFiles(directoryHandle);

    timer = setInterval(() => {
        readFiles(directoryHandle);
    }, 250);
});
