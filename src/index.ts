import LRUCache from "lru-cache";
import { nanoid } from "nanoid";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";

export interface HtmlCacheMiddlewareOptions {
  /** 最大多少个html片段, 大概值, 一个单位为 10000 * 2 / 1024 / 1024 bit */
  max?: number;
  /** 单位 MB */
  maxSize?: number;
  ttl?: number;
  exclude?: (req: NextRequest, ev: NextFetchEvent) => boolean;
  debug?: boolean;
}

/** 一个片段的MB (假设每个html都以 1000000bit 为一个单位) */
const chuckSize = (10000 * 2) / 1024 / 1024;

const defaultOptions = {
  maxSize: 100 * 1024,
  ttl: 1000 * 60 * 5,
  exclude: () => true,
  debug: false,
};

const useHtmlCacheMiddleware = (
  _options: HtmlCacheMiddlewareOptions
): NextMiddleware => {
  // @ts-ignore
  const options: Required<HtmlCacheMiddlewareOptions> = Object.assign(
    {},
    defaultOptions,
    _options
  );

  const NO_CACHE_SIGN = nanoid();

  const htmlCache = new LRUCache<string, string>({
    max: options.max,

    // for use with tracking overall storage size
    maxSize: Math.floor(options.maxSize / chuckSize),
    sizeCalculation: (value, key) => {
      const HTMLSize = ((key.length + value.length) * 2) / 1024 / 1024; // MB
      const chuckLength = HTMLSize >= chuckSize ? Math.ceil(HTMLSize) : 1;
      // console.log('sizeCalculation', chuckLength, HTMLSize / chuckSize);
      return chuckLength;
    },

    // for use when you need to clean up something when objects
    // are evicted from the cache
    dispose: (value, key) => {
      // freeFromMemoryOrWhatever(value)
    },

    // how long to live in ms
    ttl: options.ttl,

    // return stale items before removing from cache?
    allowStale: false,

    updateAgeOnGet: false,
    updateAgeOnHas: false,

    // async method to use for cache.fetch(), for
    // stale-while-revalidate type of behavior
    fetchMethod: async (key, staleValue, { options, signal }) => {},
  });

  const htmlCacheMiddleware: NextMiddleware = (req, ev) => {
    const noCache = req.nextUrl.searchParams.get(NO_CACHE_SIGN) === "1";
    if (!noCache && options.exclude(req, ev)) {
      const cacheKey = req.nextUrl.href;
      if (htmlCache.has(cacheKey)) {
        options.debug &&
          console.log("\n======== get html cache: ", req.nextUrl.href, "\n");
        const html = htmlCache.get(cacheKey)!;
        return getHTMLResponse(html);
      }
      return fetch(req.nextUrl.href)
        .then((res) => res.text())
        .then((html) => {
          options.debug &&
            console.log("\n======== set html cache: ", req.nextUrl.href, "\n");
          req.nextUrl.searchParams.set(NO_CACHE_SIGN, "1");
          htmlCache.set(cacheKey, html);
          options.debug &&
            console.log("\n======== html cache size: ", htmlCache.size, "\n");
          return getHTMLResponse(html);
        });
    }
  };

  return htmlCacheMiddleware;
};

const getHTMLResponse = (html: string) => {
  const response = new Response(html);
  response.headers.set("content-type", "text/html");
  return response;
};

export default useHtmlCacheMiddleware;
