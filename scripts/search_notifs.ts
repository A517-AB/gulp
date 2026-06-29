import {walk} from "https://deno.land/std@0.224.0/fs/walk.ts";

const targets = ["electron", "src"];
const searchTerms = ["ntofiacions", "notification", "notifications", "notif"];
const results: string[] = [];

for (const dir of targets) {
    try {
        for await (const entry of walk(dir, {includeDirs: false})) {
            try {
                const content = await Deno.readTextFile(entry.path);
                const lowerContent = content.toLowerCase();
                const matches = searchTerms.filter(term => lowerContent.includes(term));
                if (matches.length > 0) {
                    results.push(`${entry.path} (matched: ${matches.join(", ")})`);
                }
            } catch {
                // Ignore files we can't read (e.g. binaries)
            }
        }
    } catch (err) {
        console.error(`Error accessing ${dir}:`, err);
    }
}

const output = results.join("\n");
console.log(output);
await Deno.writeTextFile("notif-files.txt", output);
console.log(`\nTotal files found: ${results.length}`);
console.log(`Saved results to notif-files.txt`);
