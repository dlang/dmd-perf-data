// id, label as in PERF.md, divisor and unit to show it in, noise threshold in %
const metrics = [
    ["compile_hello_debug_instr",    "compile hello.d (instr)",             1e6,     "M",  0.1],
    ["compile_phobos_instr",         "compile Phobos (instr)",              1e6,     "M",  0.1],
    ["compile_hello_release_instr",  "compile hello.d -O -release (instr)", 1e6,     "M",  0.1],
    ["compile_phobos_codegen_instr", "compile Phobos codegen (instr)",      1e6,     "M",  0.1],
    ["compile_vibed_instr",          "compile vibe.d (instr)",              1e6,     "M",  0.1],
    ["dmd_binary_size",              "dmd binary size (stripped)",          1048576, "MB", 0.1],
    ["hello_binary_size",            "hello binary size (stripped)",        1024,    "KB", 0.1],
    ["hello_max_rss",                "peak RSS (compile hello.d)",          1024,    "MB", 2],
    ["phobos_max_rss",               "peak RSS (compile Phobos)",           1024,    "MB", 2],
    ["vibed_max_rss",                "peak RSS (compile vibe.d)",           1024,    "MB", 2],
    ["dmd_self_build_wall",          "compile dmd itself (wall)",           1000,    "s",  2],
];

const github = "https://github.com/dlang/dmd";

function allMetrics(ids)
{
    const extra = ids.filter(id => !metrics.some(m => m[0] == id)).map(id => [id, id, 1, "", 0.1]);
    return metrics.filter(m => ids.includes(m[0])).concat(extra);
}

function fmt(x, decimals)
{
    return x.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function change(prev, cur)
{
    return prev && cur != null ? (cur - prev) / prev * 100 : null;
}

function fmtChange(pct)
{
    if (pct == null)
        return "";
    const abs = Math.abs(pct).toFixed(2);
    return (abs == 0 ? "" : pct > 0 ? "+" : "-") + abs + "%";
}

function code(text)
{
    const el = document.createElement("code");
    el.textContent = text;
    return el;
}

function commitLink(sha)
{
    const a = document.createElement("a");
    a.href = "commit.html?sha=" + sha;
    a.append(code(sha.slice(0, 9)));
    return a;
}

function json(url)
{
    return fetch(url).then(r => {
        if (!r.ok)
            throw new Error(`${url}: ${r.status}`);
        return r.json();
    });
}
