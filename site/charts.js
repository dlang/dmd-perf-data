const axis = {
    stroke: "#555",
    grid: { stroke: "#E6E6E6", width: 1 },
    ticks: { stroke: "#E6E6E6", width: 1 },
};

const charts = [];
let commits = [];
let current;    

function decimals(incr)
{
    return (String(incr).split(".")[1] || "").length;
}

function chart(container, [, label, div, unit], raw)
{
    const values = raw.map(v => v == null ? null : v / div);

    const el = document.createElement("div");
    el.className = "chart";
    const title = document.createElement("h3");
    title.textContent = label;
    const plot = document.createElement("div");
    const readout = document.createElement("p");
    readout.className = "readout";
    el.append(title, plot, readout);
    container.append(el);

    function show(i)
    {
        const value = document.createElement("b");
        value.textContent = values[i] == null ? "not measured" : `${fmt(values[i], 2)} ${unit}`;
        const pct = fmtChange(change(values[i - 1], values[i]));
        readout.replaceChildren(value, pct && ` (${pct} vs previous)`, " · ", commitLink(commits[i].sha), " · " + commits[i].date.slice(0, 10));
    }

    const u = new uPlot({
        width: plot.clientWidth,
        height: 240,
        legend: { show: false },
        cursor: { y: false, points: { size: 8 }, sync: { key: "perf" }, bind: { dblclick: () => null } },
        scales: { x: { time: false } },
        series: [{}, { stroke: "#B03931", width: 2 }],
        axes: [
            {
                ...axis,
                space: 90,
                incrs: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
                values: (u, splits) => splits.map(i => commits[i] ? commits[i].date.slice(0, 10) : ""),
            },
            {
                ...axis,
                size: 70,
                values: (u, splits, ax, space, incr) => splits.map(v => `${fmt(v, decimals(incr))} ${unit}`),
            },
        ],
        hooks: {
            setCursor: [u => {
                show(u.cursor.idx ?? lastVisible(u));
                u.over.style.cursor = onPoint() ? "pointer" : "";
            }],
            setScale: [(u, key) => key == "x" && show(lastVisible(u))],
        },
    }, [Array.from(values.keys()), values], plot);

    function lastVisible(u)
    {
        return Math.min(Math.floor(u.scales.x.max), values.length - 1);
    }

    function onPoint()
    {
        const i = u.cursor.idx;
        if (i == null || values[i] == null)
            return false;
        const dx = u.valToPos(i, "x") - u.cursor.left;
        const dy = u.valToPos(values[i], "y") - u.cursor.top;
        return dx * dx + dy * dy < 12 * 12;
    }

    show(lastVisible(u));
    new ResizeObserver(() => u.setSize({ width: plot.clientWidth, height: 240 })).observe(plot);

    let downX;
    plot.addEventListener("mousedown", e => downX = e.clientX);
    plot.addEventListener("click", e => {
        if (onPoint() && Math.abs(e.clientX - downX) < 3)
            location.href = "commit.html?sha=" + commits[u.cursor.idx].sha;
    });

    plot.addEventListener("dblclick", () => setRange(...current));
    charts.push(u);
}

function setRange(from, to)
{
    current = [from, to];
    const days = commits.map(c => c.date.slice(0, 10));
    let min = days.findIndex(d => d >= from);
    let max = days.findLastIndex(d => d <= to);
    min = Math.max(0, Math.min(min < 0 ? days.length : min, days.length - 2));
    max = Math.max(max, min + 1);
    for (const u of charts)
        u.setScale("x", { min, max });
}

function daysAgo(n)
{
    return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

json("series.json").then(data => {
    commits = data.commits;
    const last = commits[commits.length - 1];
    document.getElementById("latest").replaceChildren(
        "Last commit ", commitLink(last.sha), ` at ${last.date.slice(0, 10)} ${last.date.slice(11, 16)} UTC`);

    const container = document.getElementById("charts");
    for (const m of allMetrics(Object.keys(data.metrics)))
        chart(container, m, data.metrics[m[0]]);

    const from = document.getElementById("from");
    const to = document.getElementById("to");
    from.min = to.min = commits[0].date.slice(0, 10);
    from.max = to.max = daysAgo(0);

    const presets = document.querySelectorAll("#range button[data-days]");
    const dflt = document.querySelector("#range .default");
    function select(button, query)
    {
        for (const b of presets)
            b.classList.toggle("active", b == button);
        if (button)
            from.value = to.value = "";
        history.replaceState(null, "", query ? "?" + query : location.pathname);
    }

    for (const b of presets)
        b.onclick = () => {
            select(b, b == dflt ? "" : "range=" + b.id);
            setRange(b.dataset.days ? daysAgo(b.dataset.days) : "", "9999");
        };
    from.onchange = to.onchange = () => {
        select(null, [from.value && "from=" + from.value, to.value && "to=" + to.value].filter(Boolean).join("&"));
        setRange(from.value, to.value || "9999");
    };
    document.getElementById("reset").onclick = () => dflt.click();

    const params = new URLSearchParams(location.search);
    const preset = document.getElementById(params.get("range"));
    if (preset && preset.dataset.days != null)
        preset.click();
    else if (params.has("from") || params.has("to"))
    {
        from.value = params.get("from") || "";
        to.value = params.get("to") || "";
        from.onchange();
    }
    else
        dflt.click();
}).catch(e => {
    document.getElementById("latest").textContent = "Could not load series.json: " + e.message;
});
