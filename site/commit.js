// Same order as phaseIds in timetrace.d
const phases = ["parse", "sema1", "sema2", "sema3", "sema_other", "ctfe", "dfa", "inline", "codegen", "other", "total"];

function link(text, href)
{
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    return a;
}

function row(table, ...cells)
{
    const tr = table.tBodies[0].insertRow();
    for (const cell of cells)
        tr.insertCell().append(cell);
    return tr;
}

// Microseconds as ms, like the PR comment shows them
function ms(us)
{
    const x = us / 1000;
    return fmt(x, x < 100 ? 1 : 0) + " ms";
}

function phase(trace, name)
{
    return name == "total" ? trace.total_us : trace.phases[name];
}

function record(commit)
{
    return json(`data/${commit.date.slice(0, 4)}/${commit.date.slice(5, 7)}/${commit.sha}.json`);
}

function render(commits, i, rec, prev)
{
    const c = commits[i];
    const n = rec.push.commits;
    document.title = `${c.sha.slice(0, 9)} · DMD Performance`;
    document.getElementById("sha").textContent = c.sha.slice(0, 9);
    document.getElementById("meta").replaceChildren(
        `${c.date.slice(0, 10)} ${c.date.slice(11, 16)} UTC · ${n} commit${n == 1 ? "" : "s"} since `,
        code(rec.push.before.slice(0, 9)), ` · ${rec.runner.os}, ${rec.runner.host_dmd}`);

    const links = [link("commit", `${github}/commit/${c.sha}`), " · ", link("pull request", `${github}/pulls?q=${c.sha}`)];
    if (n > 1)
        links.push(" · ", link(`all ${n} commits of this push`, `${github}/compare/${rec.push.before}...${c.sha}`));
    document.getElementById("links").replaceChildren("On GitHub: ", ...links);

    const nav = [link("all charts", "./")];
    if (i > 0)
        nav.unshift("← previous ", commitLink(commits[i - 1].sha), " · ");
    if (i + 1 < commits.length)
        nav.push(" · next ", commitLink(commits[i + 1].sha), " →");
    document.getElementById("nav").replaceChildren(...nav);

    const table = document.getElementById("metrics");
    for (const [id, label, div, unit, threshold] of allMetrics(Object.keys(rec.metrics)))
    {
        const old = prev ? prev.metrics[id] : null;
        const value = v => v == null ? "n/a" : `${fmt(v / div, 2)} ${unit}`;
        const pct = change(old, rec.metrics[id]);
        const tr = row(table, label, value(old), value(rec.metrics[id]), fmtChange(pct));
        if (Math.abs(pct) >= threshold)
            tr.cells[3].className = "significant";
    }

    const traces = document.getElementById("phases");
    for (const name of phases)
    {
        const cells = [name];
        let any = false;
        for (const w of ["hello", "phobos"])
        {
            const cur = phase(rec.time_trace[w], name);
            const old = prev ? phase(prev.time_trace[w], name) : null;
            any ||= cur > 0;
            cells.push(ms(cur), fmtChange(change(old, cur)));
        }
        if (any)
            row(traces, ...cells);
    }
}

const sha = new URLSearchParams(location.search).get("sha") || "";

json("series.json").then(async data => {
    const commits = data.commits;
    const i = sha ? commits.findIndex(c => c.sha.startsWith(sha)) : -1;
    if (i < 0)
        throw new Error(`No record for commit "${sha}".`);
    const [rec, prev] = await Promise.all([record(commits[i]), i > 0 ? record(commits[i - 1]) : null]);
    render(commits, i, rec, prev);
}).catch(e => {
    document.getElementById("meta").textContent = e.message;
});
