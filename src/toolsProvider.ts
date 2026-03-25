import { tool, Tool, ToolsProviderController } from "@lmstudio/sdk";
import { z } from "zod";
import { join } from "path";
import { writeFile } from "fs/promises";
import { configSchematics } from "./config";

export async function toolsProvider(ctl:ToolsProviderController):Promise<Tool[]> {
	const tools: Tool[] = [];

	let lastRequestTimestamp = 0;
	const TIME_BETWEEN_REQUESTS = 2000; // 2 seconds
	const waitIfNeeded = () => {
		const timestamp = Date.now();
		const difference = timestamp - lastRequestTimestamp;
		lastRequestTimestamp = timestamp;
		if (difference < TIME_BETWEEN_REQUESTS)
			return new Promise(resolve => setTimeout(resolve, TIME_BETWEEN_REQUESTS - difference));
		return Promise.resolve();
	}

	const fetchHTML = async (url:string, signal:AbortSignal, warn:(msg:string) => void) => {
		// Perform the fetch request with abort signal
		const headers = spoofHeaders(url);
		const response = await fetch(url, {
			method: "GET",
			signal,
			headers,
		});
		if (!response.ok) {
			warn(`Failed to fetch website: ${response.statusText}`);
			throw new Error(`Failed to fetch website: ${response.statusText}`);
		}
		const html = await response.text();
		const headStart = html.indexOf("<head>");
		const headEnd = html.indexOf("</head>") + 7;
		const head = html.substring(headStart, headEnd);
		const bodyStart = html.match(/<body[^>]*>/)?.index || 0;
		const bodyEnd = html.lastIndexOf("</body>") || html.length - 1;
		const body = html.substring(bodyStart, bodyEnd);
		return { html, head, body };
	}

	const duckDuckGoWebSearchTool = tool({
		name: "Web Search",
		description: "Search for web pages on DuckDuckGo using a query string and return a list of URLs.",
		parameters: {
			query: z.string().describe("The search query for finding web pages"),
			pageSize: z.number().int().min(1).max(10).optional().describe("Number of web results per page"),
			safeSearch: z.enum(["strict", "moderate", "off"]).optional().describe("Safe Search"),
			page: z.number().int().min(1).max(100).optional().default(1).describe("Page number for pagination"),
		},
		implementation: async ({ query, pageSize, safeSearch, page }, { status, warn, signal }) => {
			status("Initiating DuckDuckGo web search...");
			await waitIfNeeded(); // Wait if needed to avoid rate limiting
			try {
				pageSize = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("pageSize"), 0)
					?? pageSize
					?? 5;
				safeSearch = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("safeSearch"), "auto")
					?? safeSearch
					?? "moderate";
				
				// Construct the DuckDuckGo API URL
				const headers = spoofHeaders();
				const url = new URL("https://duckduckgo.com/html/");
				url.searchParams.append("q", query);
				if (safeSearch !== "moderate")
					url.searchParams.append("p", safeSearch === "strict" ? "-1" : "1");
				if (page > 1)
					url.searchParams.append("s", ((pageSize * (page - 1)) || 0).toString()); // Start at the appropriate index
				// Perform the fetch request with abort signal
				console.log(`Fetching DuckDuckGo search results for query: ${url.toString() }`);
				const response = await fetch(url.toString(), {
					method: "GET",
					signal,
					headers,
				});
				if (!response.ok) {
					warn(`Failed to fetch search results: ${response.statusText}`);
					return `Error: Failed to fetch search results: ${response.statusText}`;
				}
				const html = await response.text();
				const links: [string, string][] = [];
				const regex = /\shref="[^"]*(https?[^?&"]+)[^>]*>([^<]*)/gm;
				let match;
				while (links.length < pageSize && (match = regex.exec(html))) {
					const label = match[2].replace(/\s+/g, " ").trim();
					const linkUrl = decodeURIComponent(match[1]);
					if(!links.some(([,existingUrl]) => existingUrl === linkUrl))
						links.push([label, linkUrl]);
				}
				if (links.length === 0) {
					return "No web pages found for the query.";
				}
				status(`Found ${links.length} web pages.`);
				return {
					links,
					count: links.length,
				};
			} catch (error: any) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return "Search aborted by user.";
				}
				console.error(error);
				warn(`Error during search: ${error.message}`);
				return `Error: ${error.message}`;
			}
		},
	});

	const duckDuckGoImageSearchTool = tool({
		name: "Image Search",
		description: "Search for images on DuckDuckGo using a query string and return a list of image URLs.",
		parameters: {
			query: z.string().describe("The search query for finding images"),
			pageSize: z.number().int().min(1).max(10).optional().default(10).describe("Number of image results per page"),
			safeSearch: z.enum(["strict", "moderate", "off"]).optional().default("moderate").describe("Safe Search"),
			page: z.number().int().min(1).max(100).optional().default(1).describe("Page number for pagination"),
		},
		implementation: async ({ query, pageSize, safeSearch, page }, { status, warn, signal }) => {
			status("Initiating DuckDuckGo image search...");
			await waitIfNeeded();
			try {
				pageSize = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("pageSize"), 0)
					?? pageSize
					?? 5;
				safeSearch = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("safeSearch"), "auto")
					?? safeSearch
					?? "moderate";
					
				const headers = spoofHeaders();
				const initialUrl = new URL("https://duckduckgo.com/");
				initialUrl.searchParams.append("q", query);
				initialUrl.searchParams.append("iax", "images");
				initialUrl.searchParams.append("ia", "images");

				const initialResponse = await fetch(initialUrl.toString(), {
					method: "GET",
					signal,
					headers,
				});

				if (!initialResponse.ok) {
					warn(`Failed to fetch initial response: ${initialResponse.statusText}`);
					return `Error: Failed to fetch initial response: ${initialResponse.statusText}`;
				}

				const initialHtml = await initialResponse.text();
				const vqd = initialHtml.match(/vqd="([^"]+)"/)?.[1] as string;
				if (!vqd) {
					warn("Failed to extract vqd token.");
					return "Error: Unable to extract vqd token.";
				}

				await new Promise(resolve => setTimeout(resolve, 1000));

				const searchUrl = new URL("https://duckduckgo.com/i.js");
				searchUrl.searchParams.append("q", query);
				searchUrl.searchParams.append("o", "json");
				searchUrl.searchParams.append("l", "us-en");
				searchUrl.searchParams.append("vqd", vqd);
				searchUrl.searchParams.append("f", ",,,,,");
				if(safeSearch !== "moderate")
					searchUrl.searchParams.append("p", safeSearch === "strict" ? "-1" : "1");
				if (page > 1)
					searchUrl.searchParams.append("s", ((pageSize * (page - 1)) || 0).toString());

				const searchResponse = await fetch(searchUrl.toString(), {
					method: "GET",
					signal,
					headers,
				});

				if (!searchResponse.ok) {
					warn(`Failed to fetch image results: ${searchResponse.statusText}`);
					return `Error: Failed to fetch image results: ${searchResponse.statusText}`;
				}

				const data = await searchResponse.json();
				const imageResults = data.results || [];
				const imageURLs = imageResults
					.slice(0, pageSize)
					.map((result: any) => result.image)
					.filter((url: string) => url && url.match(/\.(jpg|png|gif|jpeg)$/i));

				if (imageURLs.length === 0)
					return "No images found for the query.";

				status(`Found ${imageURLs.length} images. Fetching...`);

				const workingDirectory = ctl.getWorkingDirectory();
				const timestamp = Date.now();
				const downloadPromises = imageURLs.map(async (url: string, i: number) => {
					const index = i + 1;
					try {
						const imageResponse = await fetch(url, {
							method: "GET",
							signal,
						});
						if (!imageResponse.ok) {
							warn(`Failed to fetch image ${index}: ${imageResponse.statusText}`);
							return null;
						}
						const bytes = await imageResponse.bytes();
						if (bytes.length === 0) {
							warn(`Image ${index} is empty: ${url}`);
							return null; 
						}
						const fileExtension = /image\/([\w]+)/.exec(imageResponse.headers.get('content-type') || '')?.[1]
							|| /\.([\w]+)(?:\?.*)$/.exec(url)?.[1]
							|| 'jpg';
						const fileName = `${timestamp}-${index}.${fileExtension}`;
						const filePath = join(workingDirectory, fileName);
						const localPath = filePath.replace(/\\/g, '/').replace(/^C:/, '')
						await writeFile(filePath, bytes, 'binary');
						return localPath;
					} catch (error: any) {
						if (error instanceof DOMException && error.name === "AbortError")
							return null; 
						warn(`Error fetching image ${index}: ${error.message}`);
						return null; 
					}
				});
				const downloadedImageURLs = (await Promise.all(downloadPromises)).map(x => x || 'Error downloading image');
				if (downloadedImageURLs.length === 0) {
					warn('Error fetching images');
					return imageURLs;
				}

				status(`Downloaded ${downloadedImageURLs.length} images successfully.`);
				return downloadedImageURLs;
			} catch (error: any) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return "Search aborted by user.";
				}
				console.error(error);
				warn(`Error during search: ${error.message}`);
				return `Error: ${error.message}`;
			}
		},
	});

	const viewImagesTool = tool({
		name: "View Images",
		description: "Download images from a website or a list of image URLs to make them viewable.",
		parameters: {
			imageURLs: z.array(z.string().url()).optional().describe("List of image URLs to view that were not obtained via the Visit Website tool."),
			websiteURL: z.string().url().optional().describe("The URL of the website, whose images to view."),
			maxImages: z.number().int().min(1).max(200).optional().describe("Maximum number of images to view when websiteURL is provided."),
		},
		implementation: async ({ imageURLs, websiteURL, maxImages }, { status, warn, signal }) => {
			try {
				maxImages = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("maxImages"), -1)
					?? maxImages
					?? 10;

				const imageURLsToDownload = imageURLs || [];

				if(websiteURL) {
					status("Fetching image URLs from website...");
					const { body } = await fetchHTML(websiteURL, signal, warn);
					const images = extractImages(body, websiteURL, maxImages).map(x => x[1]);
					imageURLsToDownload.push(...images);
				}

				status("Downloading images...");
				const workingDirectory = ctl.getWorkingDirectory();
				const timestamp = Date.now();
				const downloadPromises = imageURLsToDownload.map(async (url:string, i:number) => {
					if(url.startsWith(workingDirectory))
						return url; // Skip if the URL is already a local file path
					
					const index = i + 1;
					try {
						const headers = spoofHeaders(url);
						const imageResponse = await fetch(url, {
							method: "GET",
							signal,
							headers,
						});
						if (!imageResponse.ok) {
							warn(`Failed to fetch image ${index}: ${imageResponse.statusText}`);
							return null; 
						}
						const bytes = await imageResponse.bytes();
						if (bytes.length === 0) {
							warn(`Image ${index} is empty: ${url}`);
							return null;
						}
						const fileExtension = /image\/([\w]+)/.exec(imageResponse.headers.get('content-type') || '')?.[1]
							|| /\.([\w]+)(?:\?.*)$/.exec(url)?.[1]
							|| 'jpg';
						const fileName = `${timestamp}-${index}.${fileExtension}`;
						const filePath = join(workingDirectory, fileName);
						const localPath = filePath.replace(/\\/g, '/').replace(/^C:/, '')
						await writeFile(filePath, bytes, 'binary');
						return localPath;
					} catch (error: any) {
						if (error instanceof DOMException && error.name === "AbortError")
							return null;
						warn(`Error fetching image ${index}: ${error.message}`);
						return null;
					}
				});
				const downloadedImageMarkdowns = (await Promise.all(downloadPromises))
					.map((x, i) => x
						? `![Image ${i + 1}](${x})`
						: 'Error fetching image from URL: ' + imageURLsToDownload[i]
					);
				if (downloadedImageMarkdowns.length === 0) {
					warn('Error fetching images');
					return imageURLsToDownload;
				}

				status(`Downloaded ${downloadedImageMarkdowns.length} images successfully.`);
				return downloadedImageMarkdowns;
			} catch (error: any) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return "Image download aborted by user.";
				}
				console.error(error);
				warn(`Error during image download: ${error.message}`);
				return `Error: ${error.message}`;
			}
		}
	});

	const visitWebsiteTool = tool({
		name: "Visit Website",
		description: "Visit a website and return its title, headings, links, images, and text content. Images are automatically downloaded and viewable.",
		parameters: {
			url: z.string().url().describe("The URL of the website to visit"),
			findInPage: z.array(z.string()).optional().describe("Optional search terms to prioritize which links, images, and content to return."),
			maxLinks: z.number().int().min(0).max(200).optional().describe("Maximum number of links to extract from the page."),
			maxImages: z.number().int().min(0).max(200).optional().describe("Maximum number of images to extract from the page."),
			contentLimit: z.number().int().min(0).max(10_000).optional().describe("Maximum text content length to extract from the page."),
		},
		implementation: async ({ url, maxLinks, maxImages, contentLimit, findInPage: searchTerms }, context) => {
			const { status, warn, signal } = context;
			status("Visiting website...");

			try {
				maxLinks = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("maxLinks"), -1)
					?? maxLinks
					?? 40;
				maxImages = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("maxImages"), -1)
					?? maxImages
					?? 10;
				contentLimit = undefinedIfAuto(ctl.getPluginConfig(configSchematics).get("contentLimit"), -1)
					?? contentLimit
					?? 2000;

				const { head, body } = await fetchHTML(url, signal, warn);
				status("Website visited successfully.");
				
				const title = head.match(/<title>([^<]*)<\/title>/)?.[1] || ""
				const h1 = body.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] || "";
				const h2 = body.match(/<h2[^>]*>([^<]*)<\/h2>/)?.[1] || "";
				const h3 = body.match(/<h3[^>]*>([^<]*)<\/h3>/)?.[1] || "";
				const links = maxLinks && extractLinks(body, url, maxLinks, searchTerms);
				const imagesToFetch = maxImages ? extractImages(body, url, maxImages, searchTerms) : [];
				const images = maxImages &&
					(await viewImagesTool.implementation({ imageURLs: imagesToFetch.map(x => x[1]) }, context) as string[])
					.map((markdown, index) => [imagesToFetch[index][0], markdown] as [string, string]);

				const allContent = contentLimit && body
					.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
					.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
					.replace(/<[^>]+>/g, '') 
					.replace(/\s+/g, ' ') 
					.trim() || '';
				
				let content = "";
				if(searchTerms?.length && contentLimit < allContent.length) {
					const padding = `.{0,${contentLimit / (searchTerms.length * 2)}}`;
					const matches = searchTerms
						.map(term => new RegExp(padding + term + padding, 'gi').exec(allContent))
						.filter(match => !!match)
						.sort((a, b) => a.index - b.index); 
					let nextMinIndex = 0;
					for(const match of matches) {
						content += match.index >= nextMinIndex
							? match[0]
							: match[0].slice(nextMinIndex - match.index);
						nextMinIndex = match.index + match[0].length;
					}
				}
				else content = allContent.slice(0, contentLimit) 
					
				return {
					url, title, h1, h2, h3,
					...(links ? { links } : {}),
					...(images ? { images } : {}),
					...(content ? { content } : {}),
				};
			} catch (error: any) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return "Website visit aborted by user.";
				}
				console.error(error);
				warn(`Error during website visit: ${error.message}`);
				return `Error: ${error.message}`;
			}
		},
	});

	const deepSearchDuckDuckGoTool = tool({
		name: "Deep Search",
		description: "Search DuckDuckGo and automatically visit the top 3 results to extract their content and feed it back.",
		parameters: {
			query: z.string().describe("The search query"),
			maxLinks: z.number().int().min(0).max(200).optional().describe("Maximum number of links to extract from each page (default 0 for less noise)."),
			maxImages: z.number().int().min(0).max(200).optional().describe("Maximum number of images to extract from each page (default 0 for less noise)."),
			contentLimit: z.number().int().min(0).max(10_000).optional().describe("Maximum text content length to extract from each page."),
		},
		implementation: async ({ query, maxLinks, maxImages, contentLimit }, context) => {
			const { status, warn, signal } = context;
			status("Initiating Deep Search...");
			await waitIfNeeded(); 
			
			try {
				// 1. Fetch search results from DuckDuckGo
				status("Fetching DuckDuckGo search results...");
				const headers = spoofHeaders();
				const searchUrl = new URL("https://duckduckgo.com/html/");
				searchUrl.searchParams.append("q", query);
				
				const response = await fetch(searchUrl.toString(), {
					method: "GET",
					signal,
					headers,
				});
				if (!response.ok) {
					warn(`Failed to fetch search results: ${response.statusText}`);
					return `Error: Failed to fetch search results: ${response.statusText}`;
				}
				
				const html = await response.text();
				const linksToVisit: string[] = [];
				const regex = /\shref="[^"]*(https?[^?&"]+)[^>]*>([^<]*)/gm;
				let match;
				
				// Extract top 3 links
				while (linksToVisit.length < 3 && (match = regex.exec(html))) {
					const extractedUrl = decodeURIComponent(match[1]);
					if(!linksToVisit.includes(extractedUrl)) {
						linksToVisit.push(extractedUrl);
					}
				}

				if (linksToVisit.length === 0) {
					return "No web pages found for the query.";
				}

				// 2. Visit Top 3 Links
				status(`Visiting top ${linksToVisit.length} results...`);
				const results = [];
				for (const url of linksToVisit) {
					status(`Visiting ${url}...`);
					const visitResult = await visitWebsiteTool.implementation({ 
						url,
						maxLinks: maxLinks ?? 0,
						maxImages: maxImages ?? 0,
						contentLimit: contentLimit ?? 2000
					}, context);
					results.push(visitResult);
				}
				
				status("Deep search complete.");
				return results;
			} catch (error: any) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return "Search aborted by user.";
				}
				console.error(error);
				warn(`Error during deep search: ${error.message}`);
				return `Error: ${error.message}`;
			}
		}
	});

	tools.push(duckDuckGoWebSearchTool);
	tools.push(duckDuckGoImageSearchTool);
	tools.push(visitWebsiteTool);
	tools.push(viewImagesTool);
	tools.push(deepSearchDuckDuckGoTool);

	return tools;
}

const undefinedIfAuto = (value: unknown, autoValue: unknown) =>
	value === autoValue ? undefined : value as undefined;

const extractLinks = (body:string, url:string, maxLinks:number, searchTerms?:string[]) =>
	[...body.matchAll(/<a\s+[^>]*?href="([^"]+)"[^>]*>((?:\n|.)*?)<\/a>/g)]
		.map((match, index) => ({
			index,
			label: match[2]?.replace(/\\[ntr]|\s|<(?:[^>"]|"[^"]*")+>/g, " ").trim() || "",
			link: match[1]?.startsWith("/")
				? new URL(match[1], url).href
				: match[1],
		}))
		.filter(({ link }) => link?.startsWith("http"))
		.map((x, index, { length }) => {
			const ratio = 1 / Math.min(1, /\d/g.exec(x.link)?.length || 1);
			const score
				= ratio * (100 - (x.label.length + x.link.length + (20 * index / length)))
				+ (1 - ratio) * x.label.split(/\s+/).length;
			return {
				...x,
				score: searchTerms?.length
					&& searchTerms.reduce((acc, term) => acc + (x.label.toLowerCase().includes(term.toLowerCase()) ? 1000 : 0), score)
					|| score,
			};
		})
		.sort((a, b) => b.score - a.score) 
		.filter((x, i, arr) =>
			!arr.find((y, j) => j < i && y.link === x.link)
		)
		.slice(0, maxLinks) 
		.map(({ label, link }) => [label, link] as [string, string]);

const extractImages = (body:string, url:string, maxImages:number, searchTerms?:string[]) =>
	[...body.matchAll(/<img(\s+[^>]*)/g)]
		.filter(x => x[1])
		.map(([, attributes], index) => {
			const alt = attributes.match(/\salt="([^"]+)"/)?.[1] || "";
			const src = attributes.match(/\ssrc="([^"]+)"/)?.[1];
			return {
				index,
				alt,
				src: src?.startsWith("/")
					? new URL(src, url).href
					: src,
				score: searchTerms?.length
					&& searchTerms.reduce((acc, term) => acc + (alt.toLowerCase().includes(term.toLowerCase()) ? 1000 : 0), alt.length)
					|| alt.length,
			};
		})
		.filter(({ src }) => src && src.startsWith('http') && src.match(/\.(svg|png|webp|gif|jpe?g)(\?.*)?$/i)) 
		.sort((a, b) => b.score - a.score) 
		.slice(0, maxImages) 
		.sort((a, b) => a.index - b.index) 
		.map(({ src, alt }) => [alt, src] as [string, string]);

const spoofedUserAgents = [
	"Mozilla/5.0 (Linux; Android 10; SM-M515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 6.0; E5533) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.101 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 8.1.0; AX1082) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.83 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 8.1.0; TM-MID1020A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.96 Safari/537.36",
	"Mozilla/5.0 (Linux; Android 9; POT-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3.1 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.71",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36 Edg/98.0.1108.62",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36",
	"Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
	"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:97.0) Gecko/20100101 Firefox/97.0",
	"Opera/9.80 (Android 7.0; Opera Mini/36.2.2254/119.132; U; id) Presto/2.12.423 Version/12.16",
]

function spoofHeaders(url?: string) {
	const domain = url ? new URL(url).hostname : 'duckduckgo.com';
	return {
		'User-Agent': spoofedUserAgents[Math.floor(Math.random() * spoofedUserAgents.length)],
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9',
		'Accept-Encoding': 'gzip, deflate, br',
		'Referer': 'https://' + domain + '/',
		'Origin': 'https://' + domain,
		'Connection': 'keep-alive',
		'Upgrade-Insecure-Requests': '1',
		'Sec-Fetch-Dest': 'document',
		'Sec-Fetch-Mode': 'navigate',
		'Sec-Fetch-Site': url ? 'none' : 'same-origin',
		'Sec-Fetch-User': '?1',
		'Cache-Control': 'max-age=0',
	};
}