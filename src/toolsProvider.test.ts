import { extractLinks } from './toolsProvider';

describe('extractLinks', () => {
    const baseUrl = 'https://example.com';

    it('should extract standard links and clean up labels', () => {
        const body = `
            <div>
                <a href="https://example.com/page1">Page 1</a>
                <a href="https://example.com/page2">  Page 2  </a>
                <a href="https://example.com/page3">Page\n3</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 10);
        expect(result).toEqual([
            ['Page 1', 'https://example.com/page1'],
            ['Page 2', 'https://example.com/page2'],
            ['Page 3', 'https://example.com/page3'],
        ]);
    });

    it('should filter out non-HTTP(S) links', () => {
        const body = `
            <div>
                <a href="https://example.com/page1">Valid</a>
                <a href="mailto:test@example.com">Email</a>
                <a href="ftp://example.com/file">FTP</a>
                <a href="javascript:void(0)">JS</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 10);
        expect(result).toEqual([
            ['Valid', 'https://example.com/page1'],
            // mailto, ftp, and javascript are filtered out because they don't start with "http"
        ]);
    });

    it('should resolve relative links against the base URL', () => {
        const body = `
            <div>
                <a href="/about">About Us</a>
                <a href="/contact">Contact</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 10);
        expect(result).toEqual([
            ['About Us', 'https://example.com/about'],
            ['Contact', 'https://example.com/contact'],
        ]);
    });

    it('should limit the number of returned links based on maxLinks', () => {
        const body = `
            <div>
                <a href="https://example.com/1">1</a>
                <a href="https://example.com/2">2</a>
                <a href="https://example.com/3">3</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 2);
        expect(result).toEqual([
            ['1', 'https://example.com/1'],
            ['2', 'https://example.com/2'],
        ]);
    });

    it('should deduplicate links', () => {
        const body = `
            <div>
                <a href="https://example.com/page1">Page 1</a>
                <a href="https://example.com/page1">Page 1 Again</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 10);
        expect(result).toEqual([
            ['Page 1', 'https://example.com/page1'],
        ]);
    });

    it('should apply scoring and sort links based on search terms', () => {
        const body = `
            <div>
                <a href="https://example.com/apples">Bananas</a>
                <a href="https://example.com/cherries">Cherries</a>
                <a href="https://example.com/apples2">Red Apples</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 10, ['apple']);
        // 'Red Apples' matches the search term, so it should be scored higher and appear first
        expect(result[0][0]).toBe('Red Apples');
        expect(result[0][1]).toBe('https://example.com/apples2');
        expect(result.length).toBe(3);
    });

    it('should handle empty or malformed HTML gracefully', () => {
        expect(extractLinks('', baseUrl, 10)).toEqual([]);
        expect(extractLinks('<div>No links here</div>', baseUrl, 10)).toEqual([]);
        expect(extractLinks('<a href="https://example.com/no-close">Missing close', baseUrl, 10)).toEqual([]);
        // The regex requires `</a>` to match.
    });

    it('should handle HTML tags inside labels', () => {
        const body = `
            <div>
                <a href="https://example.com/test"><b>Bold</b> Link</a>
                <a href="https://example.com/img"><img src="icon.png"/> Image Link</a>
            </div>
        `;
        const result = extractLinks(body, baseUrl, 10);
        expect(result).toEqual([
            // In extractLinks:
            // label: match[2]?.replace(/\\[ntr]|\s|<(?:[^>"]|"[^"]*")+>/g, " ").trim() || "",
            // '<b>Bold</b> Link' becomes ' Bold  Link'. The extra space from </b> causes this.
            ['Bold  Link', 'https://example.com/test'],
            ['Image Link', 'https://example.com/img'],
        ]);
    });
});
