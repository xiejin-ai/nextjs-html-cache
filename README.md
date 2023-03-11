# nextjs-html-cache

nextjs-html-cache

## install

`npm i nextjs-html-cache`

## use

```ts
{
  /** 最大多少个html片段, 大概值, 一个单位为 10000 * 2 / 1024 / 1024 bit */
  max?: number;
  /** 单位 MB */
  maxSize?: number;
  /** html 存活时间（ms) 默认值为1000 * 60 * 5 */
  ttl?: number;
  exclude?: (req: NextRequest, ev: NextFetchEvent) => boolean;
  debug?: boolean;
}
```

```typescript

import useHtmlCacheMiddleware from '@/middleware/html-cache';
import type { NextMiddleware } from 'next/server';


const htmlCacheMiddleware = useHtmlCacheMiddleware({
  max:  5, // 设置大小为5个片段
  maxSize: 300, // 单位 MB
  ttl: 1000 * 60 * 15,
  exclude: req => !req.nextUrl.pathname.includes('/api'),
  debug: true,
});

const middleWare: NextMiddleware = (req, ev) => {

  return htmlCacheMiddleware(req, ev);
};

export default middleWare;

```
