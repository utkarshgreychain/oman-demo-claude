interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchTavily(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: 'basic',
    }),
  });
  if (!response.ok) throw new Error(`Tavily error ${response.status}`);
  const data = await response.json();
  return (data.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.content || '',
  }));
}

async function searchSerper(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: maxResults }),
  });
  if (!response.ok) throw new Error(`Serper error ${response.status}`);
  const data = await response.json();
  return (data.organic || []).map((item: any) => ({
    title: item.title || '',
    url: item.link || '',
    snippet: item.snippet || '',
  }));
}

async function searchBrave(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(maxResults));
  const response = await fetch(url.toString(), {
    headers: {
      'X-Subscription-Token': apiKey,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Brave error ${response.status}`);
  const data = await response.json();
  return (data.web?.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.description || '',
  }));
}

async function searchBing(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  const url = new URL('https://api.bing.microsoft.com/v7.0/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(maxResults));
  const response = await fetch(url.toString(), {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });
  if (!response.ok) throw new Error(`Bing error ${response.status}`);
  const data = await response.json();
  return (data.webPages?.value || []).map((item: any) => ({
    title: item.name || '',
    url: item.url || '',
    snippet: item.snippet || '',
  }));
}

async function searchExa(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      contents: { text: { maxCharacters: 300 } },
    }),
  });
  if (!response.ok) throw new Error(`Exa error ${response.status}`);
  const data = await response.json();
  return (data.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.text || item.highlight || '',
  }));
}

async function searchYou(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  const url = new URL('https://api.ydc-index.io/search');
  url.searchParams.set('query', query);
  url.searchParams.set('num_web_results', String(maxResults));
  const response = await fetch(url.toString(), {
    headers: { 'X-API-Key': apiKey },
  });
  if (!response.ok) throw new Error(`You.com error ${response.status}`);
  const data = await response.json();
  return (data.hits || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: (item.snippets || []).join(' ') || item.description || '',
  }));
}

async function searchSearxng(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  // apiKey is the SearXNG instance URL (e.g., https://searx.example.com)
  const instanceUrl = apiKey.replace(/\/$/, '');
  const url = new URL(`${instanceUrl}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('pageno', '1');
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`SearXNG error ${response.status}`);
  const data = await response.json();
  return (data.results || []).slice(0, maxResults).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.content || '',
  }));
}

async function searchDuckDuckGo(apiKey: string, query: string, maxResults = 5): Promise<SearchResult[]> {
  // Uses DuckDuckGo Instant Answer API (no key required)
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_redirect', '1');
  url.searchParams.set('no_html', '1');
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`DuckDuckGo error ${response.status}`);
  const data = await response.json();
  const results: SearchResult[] = [];
  // Abstract result
  if (data.AbstractText && data.AbstractURL) {
    results.push({ title: data.Heading || 'Result', url: data.AbstractURL, snippet: data.AbstractText });
  }
  // Related topics
  for (const topic of data.RelatedTopics || []) {
    if (results.length >= maxResults) break;
    if (topic.FirstURL && topic.Text) {
      results.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, snippet: topic.Text });
    }
  }
  return results;
}

const SEARCH_PROVIDERS: Record<string, (apiKey: string, query: string, maxResults?: number) => Promise<SearchResult[]>> = {
  tavily: searchTavily,
  serper: searchSerper,
  brave: searchBrave,
  bing: searchBing,
  exa: searchExa,
  you: searchYou,
  searxng: searchSearxng,
  duckduckgo: searchDuckDuckGo,
};

export async function executeSearch(
  provider: string,
  apiKey: string,
  query: string,
  maxResults = 5
): Promise<SearchResult[]> {
  const searchFn = SEARCH_PROVIDERS[provider];
  if (!searchFn) throw new Error(`Unknown search provider: ${provider}`);
  return searchFn(apiKey, query, maxResults);
}
