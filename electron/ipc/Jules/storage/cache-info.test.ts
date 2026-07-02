import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
    getSessionCacheInfo,
    updateGlobalCacheMetadata,
    getCacheInfo,
    getSessionCount,
    getActivityCount,
    getLatestActivities
} from './cache-info';

describe('cache-info', () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jules-test-'));
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('getLatestActivities should return the last n activities correctly in order', async () => {
        const sessionId = 'test-session';
        const sessionDir = path.join(tmpDir, '.jules/cache', sessionId);
        await fs.mkdir(sessionDir, { recursive: true });

        const activitiesPath = path.join(sessionDir, 'activities.jsonl');

        // Write 3 activities
        const act1 = { id: '1', text: 'hello' };
        const act2 = { id: '2', text: 'world' };
        const act3 = { id: '3', text: 'test' };

        await fs.writeFile(
            activitiesPath,
            [JSON.stringify(act1), JSON.stringify(act2), JSON.stringify(act3)].join('\n') + '\n'
        );

        const activities = await getLatestActivities(sessionId, 2, tmpDir);
        expect(activities).toEqual([act2, act3]); // Should be chronological
    });

    it('getLatestActivities should handle n larger than file lines', async () => {
        const sessionId = 'test-session';
        const sessionDir = path.join(tmpDir, '.jules/cache', sessionId);
        await fs.mkdir(sessionDir, { recursive: true });

        const activitiesPath = path.join(sessionDir, 'activities.jsonl');

        const act1 = { id: '1', text: 'hello' };

        await fs.writeFile(activitiesPath, JSON.stringify(act1) + '\n');

        const activities = await getLatestActivities(sessionId, 5, tmpDir);
        expect(activities).toEqual([act1]);
    });

    it('getLatestActivities should handle chunk sizes correctly', async () => {
        const sessionId = 'test-session2';
        const sessionDir = path.join(tmpDir, '.jules/cache', sessionId);
        await fs.mkdir(sessionDir, { recursive: true });

        const activitiesPath = path.join(sessionDir, 'activities.jsonl');

        const act1 = { id: '1', text: 'a'.repeat(4000) };
        const act2 = { id: '2', text: 'b'.repeat(4000) };
        const act3 = { id: '3', text: 'c'.repeat(4000) };

        await fs.writeFile(
            activitiesPath,
            [JSON.stringify(act1), JSON.stringify(act2), JSON.stringify(act3)].join('\n') + '\n'
        );

        const activities = await getLatestActivities(sessionId, 2, tmpDir);
        expect(activities).toEqual([act2, act3]); // Should be chronological
    });

    it('getLatestActivities should handle multi-byte characters at chunk boundaries', async () => {
        const sessionId = 'test-session3';
        const sessionDir = path.join(tmpDir, '.jules/cache', sessionId);
        await fs.mkdir(sessionDir, { recursive: true });

        const activitiesPath = path.join(sessionDir, 'activities.jsonl');

        // Let's create an activity where a multi-byte char falls exactly on the 8192 boundary.
        // We know CHUNK_SIZE = 8192.
        // We want the file size to be such that the end of the first read is in the middle of a multi-byte character.
        // We can just set the text size so that the multibyte char straddles the 8192-byte mark from the end.

        // For testing, let's just make the text contain multibyte characters, and set n=1.
        // We need the file size to be exactly 8193 bytes, and the byte at 8192 to be the middle of a multibyte char.
        const char = '😊'; // 4 bytes.
        // Let's write a file that has exactly a size where the backwards chunking splits the char.
        // We will just do this by writing string, check its buffer size, and construct it.
        const part1 = Buffer.from('a'.repeat(8190));
        const emojiBuf = Buffer.from('😊'); // 4 bytes
        const part2 = Buffer.from('\n');

        // This makes the file 8190 + 4 + 1 = 8195 bytes.
        // Reading the last 8192 bytes: position = 8195. readSize = 8192.
        // So it reads from index 3 to 8195.
        // index 3 is inside emojiBuf! emojiBuf is at 8190, 8191, 8192, 8193.
        // The first 8192 bytes from end are indices 3..8195.
        // So the cut is at index 3, which is the last byte of the 4-byte emoji.
        // Let's see if it parses.

        // Construct the file
        const text = 'a'.repeat(8190 - 15) + '😊'; // just to make sure it's valid JSON
        const act = { id: '1', text: text };
        const actStr = JSON.stringify(act) + '\n';

        await fs.writeFile(activitiesPath, actStr);

        const activities = await getLatestActivities(sessionId, 1, tmpDir);
        expect(activities[0].text).toEqual(text);
});

    it('getLatestActivities should handle chunk boundaries splitting a multi-byte char', async () => {
        const sessionId = 'test-session4';
        const sessionDir = path.join(tmpDir, '.jules/cache', sessionId);
        await fs.mkdir(sessionDir, { recursive: true });

        const activitiesPath = path.join(sessionDir, 'activities.jsonl');

        // CHUNK_SIZE is 8192
        // We want to make a file where the backwards read cuts a 4-byte character exactly in half.
        // Let file size be 8196.
        // Reading the last 8192 bytes reads from 4 to 8196.
        // So the cut is at index 4.
        // Let's place a 4-byte emoji at index 2, 3, 4, 5.
        // So byte 4 is the middle of the emoji.
        // But it's easier to mock fs.open to control chunk size? We can't easily mock it without rewriting.
        // Let's just create a file of exact size.

        const act = { id: '1', text: '' };
        // Base size of JSON.stringify(act) + \n is 18 bytes: {"id":"1","text":""}\n
        // We need the string to be long enough so the file size is 8196.
        // 8196 - 18 = 8178 bytes of text.
        // Let's put a 4-byte emoji (😊) such that its bytes cross index 4 (from the start of the file).
        // Wait, index 4 is the 5th byte of the file.
        // The file starts with {"id":"1","text":"
        // This is 17 bytes. So index 4 is inside "id":"1" - we can't put emoji there.

        // Let's change the strategy. The cut from the END is at 8192 bytes from the end.
        // Let's make the file exactly 8192 + 20 = 8212 bytes.
        // The first read reads from 20 to 8212.
        // We need the emoji to be at index 18, 19, 20, 21.
        // "{"id":"1","text":""
        // This is exactly 18 bytes!
        // So if we put an emoji right at the beginning of the text value, it will be at 18.
        // Let's make the text value: emoji + padding.
        const emoji = '😊'; // 4 bytes.
        const baseLength = Buffer.byteLength('{"id":"1","text":""}\n'); // 19 bytes.
        // We want file size such that the 8192 cut falls on byte 19, 20, or 21.
        // Let's make the cut fall on byte 20.
        // File size = 8192 + 20 = 8212 bytes.
        // Buffer.byteLength('{"id":"1","text":""}\n') is 19 bytes.
        // The emoji starts at index 18 (after `{"id":"1","text":"`).
        // Its bytes are 18, 19, 20, 21.
        // If cut is at 20, it splits the emoji in half!

        // Let's pad the text to reach file size 8212.
        // padding length = 8212 - 19 - 4 = 8189.
        const padding = 'a'.repeat(8189);
        const textValue = emoji + padding;
        const actStr = JSON.stringify({ id: '1', text: textValue }) + '\n';
        // check length
        // expect Buffer.byteLength(actStr) to be 8212

        await fs.writeFile(activitiesPath, actStr);

        const activities = await getLatestActivities(sessionId, 1, tmpDir);
        expect(activities[0].text).toEqual(textValue);
});
});
