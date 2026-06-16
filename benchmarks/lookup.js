const bench = () => {
    // Generate mock HTML
    let html = "";
    for (let i = 0; i < 40000; i++) {
        // Create lots of links, with duplicates
        const url = `https://example.com/page/${i % 10000}`;
        const label = `Page ${i}`;
        html += `<a href="${url}">${label}</a>\n`;
    }

    const pageSize = 10000; // Large page size to magnify performance difference

    // 1. Array.some method (Baseline duckDuckGoWebSearchTool)
    console.time("Baseline: Array.some");
    for (let run = 0; run < 10; run++) {
        const links = [];
        const regex = /\shref="[^"]*(https?[^?&"]+)[^>]*>([^<]*)/gm;
        let match;
        while (links.length < pageSize && (match = regex.exec(html))) {
            const label = match[2].replace(/\s+/g, " ").trim();
            const linkUrl = decodeURIComponent(match[1]);
            if(!links.some(([,existingUrl]) => existingUrl === linkUrl))
                links.push([label, linkUrl]);
        }
    }
    console.timeEnd("Baseline: Array.some");

    // 2. Set.has method (Optimized duckDuckGoWebSearchTool)
    console.time("Optimized: Set.has");
    for (let run = 0; run < 10; run++) {
        const links = [];
        const seen = new Set();
        const regex = /\shref="[^"]*(https?[^?&"]+)[^>]*>([^<]*)/gm;
        let match;
        while (links.length < pageSize && (match = regex.exec(html))) {
            const label = match[2].replace(/\s+/g, " ").trim();
            const linkUrl = decodeURIComponent(match[1]);
            if(!seen.has(linkUrl)) {
                seen.add(linkUrl);
                links.push([label, linkUrl]);
            }
        }
    }
    console.timeEnd("Optimized: Set.has");

    // 3. Array.includes method (Baseline deepSearchDuckDuckGoTool)
    console.time("Baseline: Array.includes");
    for (let run = 0; run < 10; run++) {
        const linksToVisit = [];
        const regex = /\shref="[^"]*(https?[^?&"]+)[^>]*>([^<]*)/gm;
        let match;
        while (linksToVisit.length < pageSize && (match = regex.exec(html))) {
            const extractedUrl = decodeURIComponent(match[1]);
            if(!linksToVisit.includes(extractedUrl)) {
                linksToVisit.push(extractedUrl);
            }
        }
    }
    console.timeEnd("Baseline: Array.includes");

    // 4. Set.has method (Optimized deepSearchDuckDuckGoTool)
    console.time("Optimized: Set.has (strings only)");
    for (let run = 0; run < 10; run++) {
        const linksToVisit = [];
        const seen = new Set();
        const regex = /\shref="[^"]*(https?[^?&"]+)[^>]*>([^<]*)/gm;
        let match;
        while (linksToVisit.length < pageSize && (match = regex.exec(html))) {
            const extractedUrl = decodeURIComponent(match[1]);
            if(!seen.has(extractedUrl)) {
                seen.add(extractedUrl);
                linksToVisit.push(extractedUrl);
            }
        }
    }
    console.timeEnd("Optimized: Set.has (strings only)");
}

bench();
