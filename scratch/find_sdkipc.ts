function join(a: string, b: string): string {
    const cleanA = a.replace(/[\\/]+$/, "");
    const cleanB = b.replace(/^[\\/]+/, "");
    return `${cleanA}/${cleanB}`;
}

async function* walk(dir: string): AsyncGenerator<string> {
    try {
        for await (const entry of Deno.readDir(dir)) {
            const path = join(dir, entry.name);
            if (entry.isDirectory) {
                yield* walk(path);
            } else if (entry.isFile) {
                yield path;
            }
        }
    } catch (_err) {
        // Ignore read errors
    }
}

const root = Deno.args[0] || Deno.cwd();
const targetDirs = [join(root, "src"), join(root, "electron")];

for (const dir of targetDirs) {
    for await (const filePath of walk(dir)) {
        try {
            const content = await Deno.readTextFile(filePath);
            if (content.toLowerCase().includes("sdkipc")) {
                const lines = content.split(/\r?\n/);
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes("sdkipc")) {
                        console.log(`${filePath}:${index + 1}: ${line.trim()}`);
                    }
                });
            }
        } catch (_err) {
            // Ignore binary or unreadable files
        }
    }
}
