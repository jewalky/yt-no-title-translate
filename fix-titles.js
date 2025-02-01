(() => {
    const jobs = {};

    const handleJob = async (key) => {
        const job = jobs[key];
        try {
            const rawResult = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(job.url)}&format=json`);
            const jsonResult = await rawResult.json();
            job.status = 'done';
            job.text = jsonResult.title;
            if (job.elementTitle) {
                job.elementTitle.textContent = job.text;
            }
            if (job.elementMainTitle) {
                job.elementMainTitle.textContent = job.text;
            }
            if (job.elementPageTitle) {
                job.elementPageTitle.textContent = job.text;
            }
        } catch (e) {
            console.error('Failed fetching OEmbed information about URL', job.url, e);
        }
    }

    const upsertJob = (key) => {
        if (!jobs[key]) {
            const fakeUrl = `https://youtube.com/watch?v=${key}`;
            jobs[key] = {
                status: 'pending',
                url: fakeUrl,
                elementTitle: null,
                elementPageTitle: null,
                elementMainTitle: null
            };
            handleJob(key);
        }

        return jobs[key];
    };

    const extractKeyFromUrl = (url) => {
        // currently all internal YT links are of the form /watch?v=<id>
        // if this ever changes, will require intervention.
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname !== '/watch') {
            return null;
        }
        return parsedUrl.searchParams.get('v') || null;
    };

    const upsertJobForUrl = (url) => {
        const elementKey = extractKeyFromUrl(url);
        if (!elementKey) {
            return null;
        }
        return upsertJob(elementKey);
    }

    const checkVideoMainTitleForUpdated = (element) => {
        const job = upsertJobForUrl(window.location.href);
        if (!job) {
            return;
        }
        job.elementMainTitle = element;
        // note: we do not care about this complicated hierarchy of elements in the title, for now
        // (ytd-badge-supported-renderer, yt-formatted-string, etc, etc)
        // this is because this part is implementation-specific and prone to change
        if (job.status === 'done' && job.text !== element.textContent) {
            element.textContent = job.text;
        } else if (job.status === 'pending' && '...' !== element.textContent) {
            element.textContent = '...';
        }
    };

    const checkVideoPageTitleForUpdated = (element) => {
        const job = upsertJobForUrl(window.location.href);
        if (!job) {
            return;
        }
        job.elementPageTitle = element;
        // note: we do not care about this complicated hierarchy of elements in the title, for now
        // (ytd-badge-supported-renderer, yt-formatted-string, etc, etc)
        // this is because this part is implementation-specific and prone to change
        if (job.status === 'done' && job.text !== element.textContent) {
            element.textContent = job.text;
        } else if (job.status === 'pending' && '...' !== element.textContent) {
            element.textContent = '...';
        }
    };

    const checkVideoTitleForUpdated = (element) => {
        const linkTo = element.closest('a[href]');
        if (!linkTo) {
            return;
        }
        const job = upsertJobForUrl(linkTo.href);
        if (!job) {
            return;
        }
        job.elementTitle = element;
        if (job.status === 'done' && job.text !== element.textContent) {
            element.textContent = job.text;
        } else if (job.status === 'pending' && '...' !== element.textContent) {
            element.textContent = '...';
        }
    };

    const checkNodeForUpdated = (element) => {
        if (!(element instanceof HTMLElement)) {
            return;
        }
        if (element.id === 'video-title') { // title in lists
            checkVideoTitleForUpdated(element);
        } else if (element.tagName === 'H1' &&
                   element.classList.contains('ytd-watch-metadata') &&
                   element.closest('#primary #title')) { // title on the main watched video
            checkVideoMainTitleForUpdated(element);
        } else if (element.tagName === 'TITLE') {
            checkVideoPageTitleForUpdated(element);
        }
    };

    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (!mutation.target || !(mutation.target instanceof HTMLElement)) {
                continue;
            }
            checkNodeForUpdated(mutation.target);
            [...mutation.target.querySelectorAll('*')].forEach(node => checkNodeForUpdated(node));
        }
    };

    const observer = new MutationObserver(callback);

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['id'],
        childList: true,
        characterData: true,
        subtree: true
    });

    observer.observe(document.head, {
        attributes: true,
        childList: true,
        subtree: true
    });

    [...document.querySelectorAll('*')].forEach(node => checkNodeForUpdated(node));
})();