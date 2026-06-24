// @bun
// server.ts
import {existsSync, readFileSync} from "fs";
import {resolve} from "path";
import {homedir} from "os";

var JULES_BASE = "https://jules.googleapis.com/v1alpha";
var PORT = 3939;
var PREFIX = "/api/jules";

function readApiKey() {
    if (process.env.JULES_API_KEY)
        return process.env.JULES_API_KEY;
    const p = resolve(homedir(), ".jules");
    if (existsSync(p))
        return readFileSync(p, "utf-8").trim();
    throw new Error("No JULES_API_KEY \u2014 set env or create ~/.jules");
}

var apiKey = readApiKey();
var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "*"
};
Bun.serve({
    port: PORT,
    idleTimeout: 0,
    async fetch(req) {
        const url = new URL(req.url);
        if (req.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }
        if (url.pathname === "/api/queues/tasks") {
            const tasksFile = Bun.file("tasks.json");
            if (req.method === "GET") {
                let content = "[]";
                if (await tasksFile.exists()) {
                    content = await tasksFile.text();
                }
                return new Response(content, {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                });
            }
            if (req.method === "POST") {
                try {
                    const body = await req.json();
                    await Bun.write("tasks.json", JSON.stringify(body, null, 2));
                    return new Response(JSON.stringify({success: true}), {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json"
                        }
                    });
                } catch (err) {
                    return new Response(JSON.stringify({success: false, error: String(err)}), {
                        status: 500,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json"
                        }
                    });
                }
            }
        }
        if (!url.pathname.startsWith(PREFIX)) {
            return new Response("Not found", {status: 404, headers: corsHeaders});
        }
        const julesPath = url.pathname.slice(PREFIX.length);
        const upstream = `${JULES_BASE}${julesPath}${url.search}`;
        const headers = new Headers(req.headers);
        headers.set("X-Goog-Api-Key", apiKey);
        headers.delete("host");
        const res = await fetch(upstream, {
            method: req.method,
            headers,
            body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined
        });
        return new Response(res.body, {
            status: res.status,
            headers: {
                ...corsHeaders,
                "Content-Type": res.headers.get("Content-Type") ?? "application/json",
                "Cache-Control": "no-store"
            }
        });
    }
});
console.log(`Jules proxy \u2192 http://127.0.0.1:${PORT}`);
