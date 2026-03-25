# DeepSearch Plugin for LM Studio

An extended and highly capable LM Studio plugin that combines DuckDuckGo search and advanced web visiting capabilities to give your LLMs deep access to the web.

## Features

This plugin goes beyond simple search. It provides multiple tools that the assistant can use to gather context from the web automatically:
- **Web Search**: Query DuckDuckGo to get a list of web page URLs.
- **Image Search**: Search for and automatically download viewable images.
- **Visit Website**: Provide any URL to fetch text content, images, and embedded links.
- **View Images**: Specifically extract and download images from any provided URL or image links.
- **Deep Search**: A powerful hybrid tool. It executes a DuckDuckGo search, automatically visits the top 3 results, scrapes their content, and feeds the combined information directly back to the LLM. 

## Installation

You can load this plugin locally into LM Studio using `lms plugin dev` or push it using `lms push`. 

## Configuration

The plugin provides granular controls to ensure the LLM gets exactly the right amount of context:

- **Search Results Per Page** - The maximum number of search results per page.
- **Safe Search** - The level of safe search to apply (off, moderate, strict).
- **Max Links** - Extracted link limits when visiting a website.
- **Max Images** - Download limits when visiting a website.
- **Max Content** - Character limits on the raw text content fetched from a visited page, to avoid overflowing context windows. (Set to 0 to exclude raw text).

*Note: You can leave most limits to `Auto` to let the assistant dynamically adjust to its needs.*

## How to Use

With the plugin enabled, you can instruct your assistant to "Deep search for the latest news on Mars missions", and the assistant will automatically retrieve and read the top websites for you, summarizing exactly what it found!
