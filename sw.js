const CACHE_NAME = 'v1';

self.addEventListener('fetch', (event) => {
    const getResponse = async () => {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(event.request);

        if (response) {
            console.log('Found file in cache:', event.request.url);
            return response;
        }

        console.log('Fetching:', event.request.url);
        return fetch(event.request);
    };

    event.respondWith(getResponse());
});

self.addEventListener('message', async (event) => {
    const cache = await caches.open(CACHE_NAME);

    for (const update of event.data) {
        const { type, path, file } = update;

        switch (type) {
            case 'added':
            case 'updated':
                const content = await file.arrayBuffer();

                const response = new Response(content, {
                    headers: {
                        'Content-Type': file.type,
                        'Last-Modified': file.lastModified,
                    },
                });

                await cache.put(path, response);
                break;
            case 'removed':
                await cache.delete(path);
                break;
        }
    }

    event.source.postMessage('done');
});
