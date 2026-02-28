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

const SEARCH_PROVIDERS: Record<string, (apiKey: string, query: string, maxResults?: number) => Promise<SearchResult[]>> = {
  tavily: searchTavily,
  serper: searchSerper,
  brave: searchBrave,
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
