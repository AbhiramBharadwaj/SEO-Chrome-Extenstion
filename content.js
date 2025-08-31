(async () => {
  // Dynamically load the web-vitals script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('libs/web-vitals.umd.js'); // Adjust the path
  console.log('Loading Web Vitals script:', script.src);
  script.async = true;
  script.onload = () => {
    console.log('Web Vitals script loaded successfully');
    fetchCoreWebVitals();
  };
  script.onerror = (error) => console.error('Error loading Web Vitals script:', error);
  document.head.appendChild(script);
})();

// Fetch Core Web Vitals
function fetchCoreWebVitals() {
  const vitals = { lcp: 'N/A', fid: 'N/A', cls: 'N/A' };

  // Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    vitals.lcp = `${lastEntry.startTime.toFixed(2)} ms`;
    sendVitalsToPopup(vitals);
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  // First Input Delay (FID)
  const fidObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const firstEntry = entries[0];
    vitals.fid = `${(firstEntry.processingStart - firstEntry.startTime).toFixed(2)} ms`;
    sendVitalsToPopup(vitals);
  });
  fidObserver.observe({ type: 'first-input', buffered: true });

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      if (!entry.hadRecentInput) clsValue += entry.value;
    }
    vitals.cls = clsValue.toFixed(3);
    sendVitalsToPopup(vitals);
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  // Send Core Web Vitals to popup
  function sendVitalsToPopup(data) {
    chrome.runtime.sendMessage({ type: 'core-web-vitals', data });
    console.log('Core Web Vitals:', data);
  }
}

// Fetch Schema Information
function fetchSchemaData() {
  const schemaElements = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const schemaData = schemaElements.map((element) => {
    try {
      return JSON.parse(element.textContent);
    } catch (error) {
      console.error('Error parsing schema JSON:', error);
      return { error: 'Invalid JSON-LD' };
    }
  });
  chrome.runtime.sendMessage({ type: 'schema-data', data: schemaData });
  console.log('Schema Data:', schemaData);
}

// Fetch HREFLang Information
function fetchHrefLangData() {
  const hreflangLinks = Array.from(document.querySelectorAll('link[rel="alternate"]'));
  const hreflangData = hreflangLinks.map((link) => ({
    href: link.href,
    hreflang: link.getAttribute('hreflang') || 'No hreflang',
  }));
  chrome.runtime.sendMessage({ type: 'hreflang-data', data: hreflangData });
  console.log('HREFLang Data:', hreflangData);
}

// Function to fetch image size using HEAD request for efficiency
async function fetchImageSize(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    if (!response.ok) {
      // If HEAD fails, fallback to GET
      console.log('HEAD request failed, falling back to GET');
      const getResponse = await fetch(url, { method: 'GET', mode: 'cors' });
      const contentLength = getResponse.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : null;
    }
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (error) {
    console.error('Error fetching image size:', error);
    return null;
  }
}

// Function to gather image data with sizes
async function gatherImageData() {
  const images = Array.from(document.querySelectorAll('img'));
  const imageDetails = await Promise.all(images.map(async (img) => {
    const size = await fetchImageSize(img.src); // Get image size in bytes
    return {
      src: img.src,
      alt: img.alt || 'No alt text',
      width: img.width,
      height: img.height,
      size // Store size in bytes if available
    };
  }));
  return imageDetails;
}

// Function to calculate n-grams
function calculateNGrams(text, n) {
  const words = text.split(/\s+/).filter(Boolean);
  const nGramCounts = {};

  for (let i = 0; i <= words.length - n; i++) {
    const nGram = words.slice(i, i + n).join(' ');
    nGramCounts[nGram] = (nGramCounts[nGram] || 0) + 1;
  }

  return nGramCounts;
}

// Function to gather density data
function gatherDensityData() {
  const text = document.body.innerText || ''; // Get all visible text from the page
  const densities = {};
  for (let n = 1; n <= 5; n++) {
    densities[`${n}-gram`] = calculateNGrams(text, n);
  }
  return densities;
}

// Function to gather link data
function gatherLinkData() {
  return Array.from(document.querySelectorAll('a')).map(link => ({
    href: link.href,
    anchorText: link.innerText || 'No anchor text',
    isInternal: link.href.startsWith(window.location.origin),
    nofollow: link.rel.includes('nofollow'),
    imageLink: link.querySelector('img') !== null,
    statusCode: null // Placeholder; can be fetched with server checks if needed
  }));
}

// Function to fetch status code for a URL
async function fetchStatusCode(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status;
  } catch (error) {
    console.error('Error fetching status code:', error);
    return 'Unknown';
  }
}

// Gather all data function
async function gatherAllData() {
  try {
    const title = document.title || 'Not found';
    const description = document.querySelector('meta[name="description"]')?.content || 'Not found';
    const keywords = document.querySelector('meta[name="keywords"]')?.content || 'Not found';
    const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href || 'Not found';
    const url = window.location.href || 'Not found';
    const language = document.documentElement.lang || 'Not detected';
    const author = document.querySelector('meta[name="author"]')?.content || 'Not found';
    const robotsTxt = `${new URL('/robots.txt', url)}`;
    const sitemapXml = `${new URL('/sitemap.xml', url)}`;
    const metaRobotsTag = document.querySelector('meta[name="robots"]')?.content || 'Not found';
    const totalWords = document.body.innerText.trim().split(/\s+/).length || 0;
    const pageSize = performance.getEntriesByType('navigation')[0]?.transferSize || 'Unknown';
    const googleAnalytics = !!document.querySelector('script[src*="google-analytics"]');
    const statusCode = 200; // Placeholder for static status code
    const sslCertificate = window.location.protocol === 'https:' ? 'Valid' : 'Not Secure';
    const mobileFriendly = !!document.querySelector('meta[name="viewport"]') ? 'Yes' : 'No';
    const favicon = document.querySelector('link[rel="icon"]')?.href || `${new URL('/favicon.ico', url)}`;
    const pageLoadTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    const densityData = gatherDensityData();
    

    // Fetch Schema Information
    const schemaElements = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const schemaData = schemaElements.map((element) => {
      try {
        return JSON.parse(element.textContent);
      } catch (error) {
        console.error('Error parsing schema JSON:', error);
        return { error: 'Invalid JSON-LD' };
      }
    });

    // Fetch HREFLang Information
    const hreflangLinks = Array.from(document.querySelectorAll('link[rel="alternate"]'));
    const hreflangData = hreflangLinks.map((link) => ({
      href: link.href,
      hreflang: link.getAttribute('hreflang') || 'No hreflang',
    }));

    // Core Web Vitals
    const coreWebVitals = await fetchCoreWebVitals();


// Array to store headers
let headers = [];

// Function to fetch all headers dynamically
function fetchHeaders() {
  for (let i = 1; i <= 6; i++) {
    document.querySelectorAll(`h${i}`).forEach(header => {
      const exists = headers.find(h => h.text === header.innerText && h.tag === `H${i}`);
      if (!exists) {
        headers.push({ tag: `H${i}`, text: header.innerText });
      }
    });
  }
  console.log('Headers:', headers); // Debugging
  // Send updated headers to popup.js
  chrome.runtime.sendMessage({ type: 'headers', data: headers });
}

// Observe DOM changes to capture dynamically added headers
function observeDOM() {
  const observer = new MutationObserver(() => {
    fetchHeaders();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial fetch
  fetchHeaders();
}

// Initialize observer
observeDOM();


    
    // Gather image and link data
    const images = await gatherImageData();
    const links = gatherLinkData();

    // Send the collected data to the popup
    chrome.runtime.sendMessage({
      title,
      description,
      keywords,
      canonicalUrl,
      url,
      language,
      author,
      robotsTxt,
      sitemapXml,
      metaRobotsTag,
      statusCode,
      pageSize,
      googleAnalytics,
      totalWords,
      sslCertificate,
      mobileFriendly,
      favicon,
      pageLoadTime,
      headers,
      images,
      links,
      densityData,
      coreWebVitals,
      schemaData,
      hreflangData, // Include Core Web Vitals
    });

    console.log('Data sent to popup:', {
      title,
      description,
      keywords,
      canonicalUrl,
      url,
      language,
      author,
      robotsTxt,
      sitemapXml,
      metaRobotsTag,
      statusCode,
      pageSize,
      googleAnalytics,
      totalWords,
      sslCertificate,
      mobileFriendly,
      favicon,
      pageLoadTime,
      headers,
      images,
      links,
      densityData,
      coreWebVitals,
      schemaData,
      hreflangData,
    });
  } catch (error) {
    console.error('Error in gatherAllData:', error);
  }
}

gatherAllData(); // Start the data gathering
