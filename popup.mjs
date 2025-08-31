

document.addEventListener('DOMContentLoaded', () => { 
  // Global data storage
  let headersData = [];
  let imagesData = [];
  let linksData = [];
  let schemaData = [];
  let hreflangData = [];

  const script = document.createElement('script');
script.src = chrome.runtime.getURL('./libs/jspdf.umd.min.js');
script.onload = () => {
  console.log('jsPDF loaded successfully');
};
document.head.appendChild(script);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'core-web-vitals') {
      const vitalsData = message.data;
      document.getElementById('lcp').textContent = vitalsData.lcp;
      document.getElementById('fid').textContent = vitalsData.fid;
      document.getElementById('cls').textContent = vitalsData.cls;
    }
  
    if (message.type === 'schema-data') {
      const schemaContainer = document.getElementById('schemaContainer');
      schemaContainer.innerHTML = ''; // Clear existing content
      message.data.forEach((schema, index) => {
        const schemaItem = document.createElement('div');
        schemaItem.innerHTML = `<pre>${JSON.stringify(schema, null, 2)}</pre>`;
        schemaContainer.appendChild(schemaItem);
      });
    }
  
    if (message.type === 'hreflang-data') {
      const hreflangContainer = document.getElementById('hreflangContainer');
      hreflangContainer.innerHTML = ''; // Clear existing content
      message.data.forEach((link) => {
        const hreflangItem = document.createElement('div');
        hreflangItem.textContent = `${link.hreflang}: ${link.href}`;
        hreflangContainer.appendChild(hreflangItem);
      });
    }
  });
  

  const densityTabs = document.querySelectorAll('.density-tab');
  const densityContainer = document.getElementById('densityContainer');

  const generateDensityData = () => {
    // Get text content from the website
    const textContent = document.body.innerText
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove non-alphanumeric characters except spaces
      .toLowerCase() // Convert to lowercase for uniformity
      .trim(); // Clean up whitespace
  
    const words = textContent.split(/\s+/); // Split text into words
  
    // Function to generate n-gram counts
    const ngramCounts = (n) => {
      const ngrams = {};
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
  
        // Exclude numeric-only n-grams
        if (/^\d+(\s\d+)*$/.test(ngram)) {
          continue; // Skip numeric-only terms
        }
  
        ngrams[ngram] = (ngrams[ngram] || 0) + 1;
      }
      return ngrams;
    };
  
    // Generate n-grams for 1 to 5 grams
    const ngramData = {};
    for (let n = 1; n <= 5; n++) {
      const ngramCountsData = ngramCounts(n);
      ngramData[n] = Object.entries(ngramCountsData)
        .filter(([key]) => {
          // Ensure 1-grams are single words, 2-grams are two words, etc.
          return key.split(' ').length === n;
        })
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }
    return ngramData;
  };
  
  // Use the refined density data logic
  const densityData = generateDensityData();  
const displayDensityData = (ngram) => {
  const data = densityData[ngram] || {};
  densityContainer.innerHTML = ''; // Clear previous content

  if (Object.keys(data).length > 0) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Table headers
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th style="text-align: left; border: 1px solid black; padding: 8px;">Keyword</th>
      <th style="text-align: left; border: 1px solid black; padding: 8px;">Count</th>
      <th style="text-align: left; border: 1px solid black; padding: 8px;">Density</th>
    `;
    table.appendChild(headerRow);

    // Calculate total words and find min/max values for styling
    const totalWords = Object.values(data).reduce((sum, count) => sum + count, 0);
    const counts = Object.values(data);
    const densities = counts.map((count) => (count / totalWords) * 100);

    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const maxDensity = Math.max(...densities);
    const minDensity = Math.min(...densities);

    // Populate rows with n-gram data
    for (const [keyword, count] of Object.entries(data)) {
      const density = ((count / totalWords) * 100).toFixed(2);

      const row = document.createElement('tr');
      row.style.backgroundColor =
        count === maxCount || parseFloat(density) === maxDensity
          ? '#d4edda' // Green background for high values
          : count === minCount || parseFloat(density) === minDensity
          ? '#f8d7da' // Red background for low values
          : 'transparent'; // No color for intermediate values

      row.innerHTML = `
        <td style="border: 1px solid black; padding: 8px;">${keyword}</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${count}</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${density}%</td>
      `;
      table.appendChild(row);
    }

    densityContainer.appendChild(table);
  } else {
    densityContainer.innerHTML = '<div style="text-align: center; color: #999;">No data available for this n-gram</div>';
  }
};
  

// Add click events for tabs
densityTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    densityTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const ngram = tab.getAttribute('data-ngram');
    displayDensityData(ngram);
  });
});

  // Inject content script into the active tab and fetch domain name
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab) {
      // Fetch and display domain name dynamically
      const url = new URL(activeTab.url);
      const domainName = url.hostname;
      const domainElement = document.getElementById('domainName');
      if (domainElement) {
        domainElement.textContent = domainName;
      } else {
        console.warn('Domain name element not found.');
      }
  
      // Inject content script
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Script injection failed:', chrome.runtime.lastError.message);
        }
      });
    }
  });

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener((data) => {
    console.log('Data received in popup:', data);

    headersData = data.headers || [];
    imagesData = data.images || [];
    linksData = data.links || [];
    schemaData = data.schemaData || [];
    hreflangData = data.hreflangData || [];
  
    updateImageCounts();
    updateLinkCounts();

    displaySchemaData(schemaData);
    displayHreflangData(hreflangData);

    // Update fields with the received data for Overview
    setTextContent('title', data.title);
    setTextContent('description', data.description);
    setTextContent('keywords', data.keywords);
    setTextContent('metaRobotsTag', data.metaRobotsTag);
    setTextContent('pageUrl', data.url); 
    setTextContent('canonicalUrl', data.canonicalUrl);
    setTextContent('titleLength', data.title ? `${data.title.length} characters` : 'N/A');
    setTextContent('descriptionLength', data.description ? `${data.description.length} characters` : 'N/A');
    setTextContent('statusCode', data.statusCode);
    setTextContent('pageSize', data.pageSize !== 'Unknown' ? `${(data.pageSize / 1024).toFixed(2)} KB` : 'Not found');
    setTextContent('googleAnalytics', data.googleAnalytics ? 'Present' : 'Not found');
    setTextContent('language', data.language);
    setTextContent('author', data.author);
    setTextContent('robotsTxt', `<a href="${data.robotsTxt}" target="_blank">Robots.txt</a>`);
    setTextContent('sitemapXml', `<a href="${data.sitemapXml}" target="_blank">Sitemap.xml</a>`);
    setTextContent('totalWords', data.totalWords ? `${data.totalWords} words` : 'Not found');
    setTextContent('sslCertificate', data.sslCertificate);
    setTextContent('mobileFriendly', data.mobileFriendly); 
    setTextContent('favicon', `<a href="${data.favicon}" target="_blank">View Favicon</a>`);

    // Set Page Load Time with color-coded circular indicator
    const speedCircle = document.getElementById("speedCircle");
    const pageLoadText = document.getElementById("pageLoadText");
    const pageLoadTime = data.pageLoadTime ? (data.pageLoadTime / 1000).toFixed(2) : "N/A";

    if (pageLoadTime !== "N/A") {
      speedCircle.innerHTML = `${pageLoadTime}s`;
      if (pageLoadTime < 2) {
        speedCircle.style.backgroundColor = "#28a745"; // Green for fast load
        pageLoadText.innerHTML = "Fast";
      } else if (pageLoadTime < 4) {
        speedCircle.style.backgroundColor = "#fd7e14"; // Orange for moderate load
        pageLoadText.innerHTML = "Moderate";
      } else {
        speedCircle.style.backgroundColor = "#dc3545"; // Red for slow load
        pageLoadText.innerHTML = "Slow";
      }
    } else {
      speedCircle.innerHTML = "N/A";
      speedCircle.style.backgroundColor = "#6c757d"; // Gray for unavailable data
      pageLoadText.innerHTML = "Not Available";
    }

    // Display header counts
    const headerCounts = { H1: 0, H2: 0, H3: 0, H4: 0, H5: 0, H6: 0 };
    let allHeaders = 0;

    if (headersData.length > 0) {
      headersData.forEach(header => {
        headerCounts[header.tag]++;
        allHeaders++;
      });
    }

    document.getElementById('allCount').innerText = allHeaders;
    document.getElementById('h1Count').innerText = headerCounts.H1;
    document.getElementById('h2Count').innerText = headerCounts.H2;
    document.getElementById('h3Count').innerText = headerCounts.H3;
    document.getElementById('h4Count').innerText = headerCounts.H4;
    document.getElementById('h5Count').innerText = headerCounts.H5;
    document.getElementById('h6Count').innerText = headerCounts.H6;

    // Display headers in the Headers tab
    displayHeaders('all'); // Default to show all headers

    // Display images in the Images tab
    filterImages('all'); // Default to all images

    // Initialize link display with "All Links" category
    filterLinks('all');

    // Add event listeners for image category tabs
    document.querySelectorAll('.image-tab').forEach(tab => {
      tab.addEventListener('click', (event) => {
        document.querySelectorAll('.image-tab').forEach(t => t.classList.remove('active'));
        event.currentTarget.classList.add('active');
        const category = event.currentTarget.dataset.category;
        filterImages(category);
      });
    });

    document.querySelectorAll(".floating-dock .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove the active class from all tabs
        document
          .querySelectorAll(".floating-dock .tab")
          .forEach((tab) => tab.classList.remove("active"));
    
        // Add the active class to the clicked tab
        tab.classList.add("active");
    
        // Switch content based on the data-tab value
        const activeTab = tab.getAttribute("data-tab");
        document.querySelectorAll(".content-section").forEach((section) => {
          if (section.id === activeTab) {
            section.style.display = "block";
          } else {
            section.style.display = "none";
          }
        });
      });
    });
    

    // Event listeners for header filter buttons
    document.querySelectorAll('.header-count-button').forEach(button => {
      button.addEventListener('click', (event) => {
        const filter = event.currentTarget.dataset.filter;
        displayHeaders(filter);
      });
    });

    // Add event listeners for link category tabs
    document.querySelectorAll('.link-tab').forEach(tab => {
      tab.addEventListener('click', (event) => {
        const category = event.currentTarget.dataset.category;
        filterLinks(category);
      });
    });

    // Initial load of all headers
    displayHeaders('all');
  });

  // Function to update image category counts in the tab labels
  function updateImageCounts() {
    document.getElementById('allImagesCount').innerText = imagesData.length;
    document.getElementById('withoutAltCount').innerText = imagesData.filter(img => !img.alt || img.alt === 'No alt text').length;
    document.getElementById('withoutTitleCount').innerText = imagesData.filter(img => !img.title || img.title === 'No title text').length;
    document.getElementById('oldFormatCount').innerText = imagesData.filter(img => {
      const ext = img.src.split('.').pop().toLowerCase();
      return ['png', 'jpg', 'jpeg', 'svg'].includes(ext);
    }).length;
    document.getElementById('largeImagesCount').innerText = imagesData.filter(img => img.size && img.size > 100 * 1024).length;
    document.getElementById('withAltCount').innerText = imagesData.filter(img => img.alt && img.alt !== 'No alt text').length;
    document.getElementById('withTitleCount').innerText = imagesData.filter(img => img.title && img.title !== 'No title text').length;
  }


  // Function to update link counts
  function updateLinkCounts() {
    document.getElementById('allLinksCount').innerText = linksData.length;
    document.getElementById('internalLinksCount').innerText = linksData.filter(link => link.isInternal).length;
    document.getElementById('externalLinksCount').innerText = linksData.filter(link => !link.isInternal).length;
    document.getElementById('brokenLinksCount').innerText = linksData.filter(link => link.statusCode === 404).length;
    document.getElementById('redirectedLinksCount').innerText = linksData.filter(link => link.statusCode >= 300 && link.statusCode < 400).length;
    document.getElementById('nofollowLinksCount').innerText = linksData.filter(link => link.nofollow).length;
    document.getElementById('dofollowLinksCount').innerText = linksData.filter(link => !link.nofollow).length;
    document.getElementById('imageLinksCount').innerText = linksData.filter(link => link.imageLink).length;
  }

  // Function to display headers based on filter
  function displayHeaders(filter) {
    const headersContainer = document.getElementById('headersContainer');
    headersContainer.innerHTML = ''; // Clear existing header content
  
    const filteredHeaders = filter === 'all'
      ? headersData
      : headersData.filter(header => header.tag === filter);
  
    if (filteredHeaders.length > 0) {
      filteredHeaders.forEach(header => {
        const headerElement = document.createElement('div');
        headerElement.className = 'header-item';
        headerElement.innerHTML = `<strong class="${header.tag}">${header.tag}</strong>: ${header.text}`;
        headersContainer.appendChild(headerElement);
      });
    } else {
      headersContainer.innerText = `No ${filter} headers found on this page.`;
    }
  }
  
  // Attach event listeners to filter buttons (if applicable)
  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter; // Example: <button data-filter="H1">H1</button>
      displayHeaders(filter);
    });
  });
  
  // Initially display all headers
  displayHeaders('all');

  // Function to filter images based on selected category
  function filterImages(category) {
    let filteredImages;
    switch (category) {
      case 'without-alt':
        filteredImages = imagesData.filter(img => !img.alt || img.alt === 'No alt text');
        break;
      case 'without-title':
        filteredImages = imagesData.filter(img => !img.title || img.title === 'No title text');
        break;
      case 'old-format':
        filteredImages = imagesData.filter(img => {
          const ext = img.src.split('.').pop().toLowerCase();
          return ['png', 'jpg', 'jpeg', 'svg'].includes(ext);
        });
        break;
      case 'large':
        filteredImages = imagesData.filter(img => img.size && img.size > 100 * 1024); // Images > 100KB
        break;
      case 'with-alt':
        filteredImages = imagesData.filter(img => img.alt && img.alt !== 'No alt text');
        break;
      case 'with-title':
        filteredImages = imagesData.filter(img => img.title && img.title !== 'No title text');
        break;
      default:
        filteredImages = imagesData; // 'all' category or fallback
    }
    displayImages(filteredImages);
  }

  // Function to display images based on filter
  function displayImages(filteredImages) {
    const imagesContainer = document.getElementById('imagesContainer');
    imagesContainer.innerHTML = ''; // Clear existing content

    const totalImages = filteredImages.length;
    const countElement = document.createElement('p');
    countElement.innerHTML = `<strong>Total Images:</strong> ${totalImages}`;
    imagesContainer.appendChild(countElement);

    if (totalImages > 0) {
      filteredImages.forEach((image, index) => {
        const imageSizeKB = image.size && !isNaN(image.size)
          ? `${(image.size / 1024).toFixed(2)} KB`
          : 'Size not available';

        const imageTable = document.createElement('div');
        imageTable.className = 'simple-image-table';
        imageTable.innerHTML = `
          <table>
  <tr><td colspan="2" class="table-header">Image ${index + 1}</td></tr>
  <tr>
    <td class="label">Image URL:</td>
    <td class="value">
      <a href="${image.src}" target="_blank" class="image-link" data-src="${image.src}">
        View Image
      </a>
    </td>
  </tr>
  <tr><td class="label">Alt Tag:</td><td class="value">${image.alt}</td></tr>
  <tr><td class="label">Title:</td><td class="value">${image.title || 'No title text'}</td></tr>
  <tr><td class="label">Image Width:</td><td class="value">${image.width}px</td></tr>
  <tr><td class="label">Image Height:</td><td class="value">${image.height}px</td></tr>
  <tr><td class="label">Image Size:</td><td class="value">${imageSizeKB}</td></tr>
</table>

        `;
        imagesContainer.appendChild(imageTable);
      });
    } else {
      imagesContainer.innerText = 'No images found for this category.';
    }
  }

  // Function to filter and display links based on selected category
  function filterLinks(category) {
    let filteredLinks;
    switch (category) {
      case 'internal':
        filteredLinks = linksData.filter(link => link.isInternal);
        break;
      case 'external':
        filteredLinks = linksData.filter(link => !link.isInternal);
        break;
      case 'broken':
        filteredLinks = linksData.filter(link => link.statusCode === 404);  // Example status check
        break;
      case 'redirected':
        filteredLinks = linksData.filter(link => link.statusCode >= 300 && link.statusCode < 400);
        break;
      case 'nofollow':
        filteredLinks = linksData.filter(link => link.nofollow);
        break;
      case 'dofollow':
        filteredLinks = linksData.filter(link => !link.nofollow);
        break;
      case 'image-links':
        filteredLinks = linksData.filter(link => link.imageLink);
        break;
      case 'duplicate':
        const uniqueLinks = new Set();
        filteredLinks = linksData.filter(link => {
          if (uniqueLinks.has(link.href)) return true;
          uniqueLinks.add(link.href);
          return false;
        });
        break;
      default:
        filteredLinks = linksData; // Show all links by default
    }
    displayLinks(filteredLinks);
  }

  // Function to display filtered links
  function displayLinks(filteredLinks) {
    const linksContainer = document.getElementById('linksContainer');
    linksContainer.innerHTML = ''; // Clear existing content

    if (filteredLinks.length > 0) {
      filteredLinks.forEach((link, index) => {
        const linkElement = document.createElement('div');
        linkElement.className = 'link-item';
        linkElement.innerHTML = `
<table class="simple-link-table" style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
  <tr style="background-color: #f7f7f7; border-bottom: 1px solid #ddd;">
    <td class="label" style="padding: 12px; font-weight: bold; border-right: 1px solid #ddd;">Link ${index + 1}:</td>
    <td class="value" style="padding: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px;">
      <a href="${link.href}" target="_blank" style="color: #007BFF; text-decoration: none; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${link.href}</a>
    </td>
  </tr>
  <tr style="border-bottom: 1px solid #ddd;">
    <td class="label" style="padding: 12px; font-weight: bold; border-right: 1px solid #ddd;">Anchor Text:</td>
    <td class="value" style="padding: 12px;">${link.anchorText || 'No anchor text'}</td>
  </tr>
  <tr style="background-color: #f7f7f7; border-bottom: 1px solid #ddd;">
    <td class="label" style="padding: 12px; font-weight: bold; border-right: 1px solid #ddd;">Type:</td>
    <td class="value" style="padding: 12px;">${link.isInternal ? 'Internal' : 'External'}</td>
  </tr>
  <tr style="border-bottom: 1px solid #ddd;">
    <td class="label" style="padding: 12px; font-weight: bold; border-right: 1px solid #ddd;">Nofollow:</td>
    <td class="value" style="padding: 12px;">${link.nofollow ? 'Yes' : 'No'}</td>
  </tr>
  <tr style="background-color: #f7f7f7; border-bottom: 1px solid #ddd;">
    <td class="label" style="padding: 12px; font-weight: bold; border-right: 1px solid #ddd;">Image Link:</td>
    <td class="value" style="padding: 12px;">${link.imageLink ? 'Yes' : 'No'}</td>
  </tr>
  <tr>
    <td class="label" style="padding: 12px; font-weight: bold; border-right: 1px solid #ddd;">Status Code:</td>
    <td class="value" style="padding: 12px;">${link.statusCode || 'Unknown'}</td>
  </tr>
</table>

        `;
        linksContainer.appendChild(linkElement);
      });
    } else {
      linksContainer.innerText = 'No links found for this category.';
    }
  }

  function displaySchemaData(schemaData) {
    const schemaContainer = document.getElementById('schemaContainer');
    schemaContainer.innerHTML = ''; // Clear existing content

    // Add border and padding to schemaContainer
    schemaContainer.style.padding = '15px';
    schemaContainer.style.border = '1px solid #ccc';
    schemaContainer.style.borderRadius = '8px';
    schemaContainer.style.backgroundColor = '#ffffff';
    schemaContainer.style.marginTop = '20px';

    // Add heading dynamically
    const heading = document.createElement('h2');
    heading.textContent = 'Schema Information';
    heading.style.marginBottom = '10px';
    heading.style.color = '#333';
    heading.style.fontSize = '20px';
    heading.style.fontWeight = 'bold';
    schemaContainer.appendChild(heading);

    // Extract all distinct @type values recursively
    const schemaTypes = extractDistinctSchemaTypes(schemaData);

    if (schemaTypes.length > 0) {
        const table = document.createElement('table');
        table.className = 'schema-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '10px';

        // Add table header
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f4f4f4';

        const srNoHeader = document.createElement('th');
        srNoHeader.textContent = 'Sr. No';
        srNoHeader.style.border = '1px solid #ddd';
        srNoHeader.style.padding = '8px';
        srNoHeader.style.textAlign = 'left';

        const schemaTypeHeader = document.createElement('th');
        schemaTypeHeader.textContent = 'Schema Type';
        schemaTypeHeader.style.border = '1px solid #ddd';
        schemaTypeHeader.style.padding = '8px';
        schemaTypeHeader.style.textAlign = 'left';

        headerRow.appendChild(srNoHeader);
        headerRow.appendChild(schemaTypeHeader);
        table.appendChild(headerRow);

        // Add table rows
        schemaTypes.forEach((type, index) => {
            const row = document.createElement('tr');

            const srNoCell = document.createElement('td');
            srNoCell.textContent = index + 1;
            srNoCell.style.border = '1px solid #ddd';
            srNoCell.style.padding = '8px';

            const schemaTypeCell = document.createElement('td');
            schemaTypeCell.textContent = type;
            schemaTypeCell.style.border = '1px solid #ddd';
            schemaTypeCell.style.padding = '8px';

            row.appendChild(srNoCell);
            row.appendChild(schemaTypeCell);
            table.appendChild(row);
        });

        schemaContainer.appendChild(table);
    } else {
        schemaContainer.innerHTML += `
          <div class="no-data" style="padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
            No schema data found on this page.
          </div>`;
    }
}


  

function extractDistinctSchemaTypes(data, results = new Set()) {
  if (Array.isArray(data)) {
    // If data is an array, iterate over each item
    data.forEach((item) => extractDistinctSchemaTypes(item, results));
  } else if (typeof data === 'object' && data !== null) {
    // If data is an object, check if it contains @type
    if (data['@type']) {
      results.add(data['@type']); // Add to the Set to ensure uniqueness
    }
    // Recursively process each key
    Object.values(data).forEach((value) => extractDistinctSchemaTypes(value, results));
  }
  return Array.from(results); // Convert Set to Array
}

function displayHreflangData(hreflangData) {
  const hreflangContainer = document.getElementById('hreflangContainer');
  hreflangContainer.innerHTML = ''; // Clear existing content

  // Add a heading inside the container
  const heading = document.createElement('h2');
  heading.textContent = 'HREFLang Information';
  heading.style.marginBottom = '10px';
  heading.style.color = '#333';
  heading.style.fontSize = '20px';
  heading.style.fontWeight = 'bold';
  hreflangContainer.appendChild(heading);

  // Add information panel
  const infoPanel = document.createElement('div');
  infoPanel.className = 'info-panel';
  infoPanel.style.marginBottom = '20px';
  infoPanel.style.padding = '10px';
  infoPanel.style.border = '1px solid #ddd';
  infoPanel.style.borderRadius = '8px';
  infoPanel.style.backgroundColor = '#f9f9f9';
  infoPanel.innerHTML = `
    <p><strong>Note:</strong> <em>Hreflang</em> tags help search engines display the correct language or regional URL version of a webpage to users. It's essential for improving the international user experience and SEO for multilingual or multi-regional websites.</p>
  `;
  hreflangContainer.appendChild(infoPanel);

  if (hreflangData.length > 0) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';

    // Add table header
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f4f4f4';

    const columns = ['Sr. No', 'Language', 'URL', 'Status', 'Back Reference'];
    columns.forEach((col) => {
      const th = document.createElement('th');
      th.style.border = '1px solid #ddd';
      th.style.padding = '8px';
      th.style.textAlign = 'left';
      th.textContent = col;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Add table rows
    hreflangData.forEach((item, index) => {
      const row = document.createElement('tr');

      // Add Sr. No
      const srNoCell = document.createElement('td');
      srNoCell.style.border = '1px solid #ddd';
      srNoCell.style.padding = '8px';
      srNoCell.textContent = index + 1;
      row.appendChild(srNoCell);

      // Add Language
      const langCell = document.createElement('td');
      langCell.style.border = '1px solid #ddd';
      langCell.style.padding = '8px';
      langCell.textContent = item.language || 'N/A';
      row.appendChild(langCell);

      // Add URL
      const urlCell = document.createElement('td');
      urlCell.style.border = '1px solid #ddd';
      urlCell.style.padding = '8px';
      urlCell.innerHTML = item.url
        ? `<a href="${item.url}" target="_blank" style="color: #007BFF; text-decoration: none;">${item.url}</a>`
        : 'N/A';
      row.appendChild(urlCell);

      // Add Status
      const statusCell = document.createElement('td');
      statusCell.style.border = '1px solid #ddd';
      statusCell.style.padding = '8px';
      statusCell.innerHTML =
        item.status && item.status !== 'Unknown'
          ? `<span style="color: green; font-weight: bold;">${item.status}</span>`
          : `<span style="color: red; font-weight: bold;">Unknown</span>`;
      row.appendChild(statusCell);

      // Add Back Reference
      const backRefCell = document.createElement('td');
      backRefCell.style.border = '1px solid #ddd';
      backRefCell.style.padding = '8px';
      backRefCell.textContent = item.backRef ? 'Yes' : 'No';
      row.appendChild(backRefCell);

      table.appendChild(row);
    });

    hreflangContainer.appendChild(table);
  } else {
    hreflangContainer.innerHTML += `
      <div class="no-data" style="padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
        No HREFLang data found on this page.
      </div>`;
  }
}


// Add styles in your CSS for schema and hreflang presentation
const style = document.createElement('style');
style.textContent = `
  /* Status styling */
  .status-available {
    background-color: #28a745; /* Green color */
    color: white;
    padding: 5px 10px;
    border-radius: 15px;
    display: inline-block;
    font-weight: bold;
  }

  /* Container for schema items */
  .schema-item {
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 10px;
    padding: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  /* Header styling with clickable toggle */
  .schema-header {
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    color: #007bff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0;
  }

  /* Content styling for collapsible JSON display */
  .schema-content {
    margin-top: 8px;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
    opacity: 0;
  }

  .schema-content.collapsed {
    max-height: 500px; /* Adjust as needed */
    opacity: 1;
  }

  /* JSON Syntax Highlighting */
  pre {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  pre .string { color: #e67e22; }
  pre .number { color: #1abc9c; }
  pre .boolean { color: #3498db; }
  pre .null { color: #95a5a6; }
  pre .key { color: #9b59b6; font-weight: bold; }

  /* Toggle arrow style */
  .schema-header::after {
    content: '\\25BC'; /* Down arrow */
    font-size: 12px;
    transform: rotate(0deg);
    transition: transform 0.3s;
  }

  .schema-content.collapsed + .schema-header::after {
    transform: rotate(-90deg); /* Rotate when collapsed */
  }
`;
document.head.appendChild(style);


  // Utility function to safely set text content
  function setTextContent(id, content) {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = content;
    } else {
      console.warn(`Element with id "${id}" not found.`);
    }
  }

// Tab switching logic
const tabs = document.querySelectorAll('.tab');
const contentSections = document.querySelectorAll('.content-section');

// Retrieve the last active tab from localStorage or default to "overview"
let activeTab = localStorage.getItem('activeTab') || 'overview';

function activateTab(selectedTab) {
  // Save the active tab to localStorage
  localStorage.setItem('activeTab', selectedTab);

  // Add active class to the clicked tab and corresponding content section
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === selectedTab);
  });
  contentSections.forEach(section => {
    section.style.display = section.id === selectedTab ? 'block' : 'none';
  });
}

// Attach click event listeners to each tab
tabs.forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
});

// Activate the saved tab or the default tab on page load
activateTab(activeTab);

let imageData = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'IMAGE_DATA') {
    imageData = message.data;
    console.log('Received Image Data:', imageData);
  }
});


document.getElementById('downloadReportButton').addEventListener('click', async () => {
  try {
// Use jsPDF from the global window object
const jsPDF = window.jspdf.jsPDF;

if (!jsPDF) {
  console.error('jsPDF is not available!');
  return;
}

const pdf = new jsPDF();

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let y = 20; // Initial vertical position

    // Fetch the logo
    const logoUrl = 'icons/logotrans.png'; // Update with your logo path
    const logo = await fetch(logoUrl)
      .then(response => response.blob())
      .then(blob => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      });

    // Utility to add logo to the page three times
    const addLogoToPage = () => {
      const logoWidth = 50; // Width of the logo
      const logoHeight = 50; // Height of the logo

      // Add logo at 3 positions on the page
      pdf.addImage(logo, 'PNG', pageWidth / 2 - 25, 10, logoWidth, logoHeight); // Top center
      pdf.addImage(logo, 'PNG', pageWidth / 2 - 25, pageHeight / 2 - 25, logoWidth, logoHeight); // Middle center
      pdf.addImage(logo, 'PNG', pageWidth / 2 - 25, pageHeight - 60, logoWidth, logoHeight); // Bottom center
    };

    // Utility to add section titles with default color
    const addSectionTitle = (title) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        addLogoToPage();
        y = 20; // Reset vertical position
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0); // Black
      pdf.text(title, 10, y);
      y += 10;
    };

    // Utility to add text blocks with label coloring
    const addTextBlock = (label, value, color = [0, 0, 0]) => {
      if (!value || value === 'N/A') return; // Skip empty values
      const lineHeight = 10; // Height of each line
    
      // Check if the current content exceeds the page height
      if (y > pageHeight - 20) {
        pdf.addPage(); // Add a new page
        addLogoToPage(); // Add logos to the new page
        y = 20; // Reset vertical position
      }
    
      // Add the label
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(...color);
      pdf.text(`${label}:`, 10, y);
    
      // Add the value
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0); // Default black color for value
      pdf.text(value, 50, y);
    
      y += lineHeight; // Move to the next line
    };

    // Fetch dynamic data
    const title = document.getElementById('title')?.textContent || 'N/A';
    const description = document.getElementById('description')?.textContent || 'N/A';
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || 'Not found';
    const metaRobotsTag = document.querySelector('meta[name="robots"]')?.content || 'Not found';
    const canonicalUrl = document.getElementById('canonicalUrl')?.textContent || 'N/A';
    const url = window.location.href || 'N/A';

    const pageSize = performance.getEntriesByType('navigation')[0]?.transferSize || 'Unknown';
    const totalWords = document.getElementById('totalWords')?.textContent || 'N/A';
    const googleAnalytics = !!document.querySelector('script[src*="google-analytics"]') ? 'Present' : 'Not Present';
    const sslCertificate = window.location.protocol === 'https:' ? 'Valid' : 'Not Secure';
    const mobileFriendly = !!document.querySelector('meta[name="viewport"]') ? 'Yes' : 'No';
    const favicon = document.querySelector('link[rel="icon"]')?.href || 'N/A';
    const pageLoadTime = `${(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart) / 1000} s`;

    const headersData = Array.from(document.querySelectorAll('.header-item')).map(header => ({
      tag: header.querySelector('strong')?.textContent || 'N/A',
      text: header.textContent.trim() || 'N/A',
    })).filter(header => header.text !== 'N/A'); // Filter out empty headers

    // Fetch image data using the gatherImageData function
    const gatherImageData = async () => {
      const images = Array.from(document.querySelectorAll('img'));
      const imageDetails = await Promise.all(images.map(async (img) => {
        const size = img.complete ? `${(img.naturalWidth * img.naturalHeight / 1024).toFixed(2)} KB` : 'Size not available';
        return {
          src: img.src || 'N/A',
          alt: img.alt || 'No alt text',
          title: img.title || 'No title text',
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0,
          size
        };
      }));
      return imageDetails.filter(image => image.src !== 'N/A');
    };

    const imagesData = await gatherImageData();
    console.log('Fetched Images:', imagesData);
    console.log('Images in DOM:', document.querySelectorAll('img'));


    // Add title at the beginning of the page
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 255); // Blue color for the title
    pdf.text('Detailed SEO Report of the Website', pageWidth / 2 - 60, y);
    y += 20;

    // Add logos to the first page
    addLogoToPage();

    // Add sections and data with color coding
    addSectionTitle('Page Insights');
    addTextBlock('Title', title, [0, 128, 0]); // Green
    addTextBlock('Description', description, [255, 69, 0]); // Orange
    addTextBlock('Meta Keywords', metaKeywords, [0, 0, 255]); // Blue
    addTextBlock('Meta Robots Tag', metaRobotsTag, [128, 0, 128]); // Purple
    addTextBlock('Canonical URL', canonicalUrl, [0, 0, 255]); // Blue
    addTextBlock('URL', url, [0, 0, 255]); // Blue

    addSectionTitle('Domain and Webpage Insights');
    addTextBlock('Page Size', `${(pageSize / 1024).toFixed(2)} KB`, [255, 140, 0]); // Dark Orange
    addTextBlock('Total Words', totalWords, [0, 128, 0]); // Green
    addTextBlock('Google Analytics', googleAnalytics, [255, 140, 0]); // Dark Orange
    addTextBlock('SSL Certificate', sslCertificate, [0, 128, 0]); // Green
    addTextBlock('Mobile-Friendly', mobileFriendly, [0, 128, 0]); // Green
    addTextBlock('Favicon', favicon, [0, 0, 255]); // Blue

    addSectionTitle('Page Speed Insights');
    addTextBlock('Page Load Time', pageLoadTime, [34, 139, 34]); // Forest Green

    // Add Headers Information
    addSectionTitle('Headers Information');
    headersData.forEach(header => {
      addTextBlock(header.tag, header.text, [0, 0, 0]); // Default black color for headers
    });

    addSectionTitle('Images Information');
    imageData.forEach((image, index) => {
      addTextBlock(`Image ${index + 1} URL`, image.src);
      addTextBlock('Alt Tag', image.alt);
      addTextBlock('Image Width', `${image.width}px`);
      addTextBlock('Image Height', `${image.height}px`);
      addTextBlock('Image Size', image.size);
    });

 // Fetch all distinct links data
const linksData = Array.from(document.querySelectorAll('a'))
.map(link => ({
  href: link.href || 'No URL',
  anchorText: link.textContent.trim() || 'No anchor text',
  isInternal: link.href.startsWith(window.location.origin),
  nofollow: link.rel.includes('nofollow'),
  imageLink: link.querySelector('img') !== null,
  statusCode: 'Unknown' // Placeholder; requires server-side checking for accurate status code
}))
.filter(
  (link, index, self) =>
    !link.href.startsWith('chrome-extension://') &&
    self.findIndex(l => l.href === link.href) === index // Ensure distinct URLs
);

console.log('Fetched Links:', linksData);

// Add Links Information to the PDF
addSectionTitle('Links Information');
linksData.forEach((link, index) => {
if (y > pageHeight - 50) {
  pdf.addPage();
  addLogoToPage();
  y = 20; // Reset vertical position
}
pdf.setFont('helvetica', 'bold');
pdf.setFontSize(12);
pdf.setTextColor(0, 0, 0);
pdf.text(`Link ${index + 1}:`, 10, y);
y += 10;

// Wrap and allow copying of URLs
const urlLines = pdf.splitTextToSize(link.href, pageWidth - 20); // Wrap text to fit within the page width
urlLines.forEach(line => {
  pdf.setTextColor(0, 0, 255); // Blue for URLs
  pdf.textWithLink(line, 10, y, { url: link.href }); // Make the URL clickable
  y += 10;
});

addTextBlock('Anchor Text', link.anchorText, [0, 128, 0]); // Green
addTextBlock('Type', link.isInternal ? 'Internal' : 'External', [128, 0, 128]); // Purple
addTextBlock('Nofollow', link.nofollow ? 'Yes' : 'No', [255, 69, 0]); // Orange
addTextBlock('Image Link', link.imageLink ? 'Yes' : 'No', [255, 140, 0]); // Dark Orange
addTextBlock('Status Code', link.statusCode, [255, 0, 0]); // Red
y += 10; // Add space between links
});


/// Add Schema Data to PDF
const addSchemaDataToPDF = (schemaData) => {
  addSectionTitle('Schema Information');
  if (schemaData && schemaData.length > 0) {
    schemaData.forEach((schema, index) => {
      if (y > pageHeight - 50) {
        pdf.addPage();
        addLogoToPage();
        y = 20; // Reset vertical position
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Schema Item ${index + 1}:`, 10, y);
      y += 10;

      Object.entries(schema).forEach(([key, value]) => {
        const formattedValue =
          typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
        addTextBlock(key, formattedValue, [0, 0, 0]); // Default black
      });
      y += 10; // Add space between schema items
    });
  } else {
    addTextBlock('Schema Data', 'No schema data found on this page.', [255, 0, 0]); // Red
  }
};


// Add HREFLang Data to PDF
const addHreflangDataToPDF = (hreflangData) => {
  addSectionTitle('HREFLang Information');
  if (hreflangData && hreflangData.length > 0) {
    hreflangData.forEach((item, index) => {
      if (y > pageHeight - 50) {
        pdf.addPage();
        addLogoToPage();
        y = 20; // Reset vertical position
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`HREFLang Item ${index + 1}:`, 10, y);
      y += 10;

      addTextBlock('Language', item.language, [0, 128, 0]); // Green
      addTextBlock('URL', item.url, [0, 0, 255]); // Blue
      addTextBlock('Status', item.status || 'Unknown', [255, 69, 0]); // Orange
      addTextBlock('Back Reference', item.backRef ? 'Yes' : 'No', [128, 0, 128]); // Purple
      y += 10; // Add space between hreflang items
    });
  } else {
    addTextBlock('HREFLang Data', 'No HREFLang data found on this page.', [255, 0, 0]); // Red
  }
};

    // Save the PDF
    pdf.save('dynamic-report.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
});



});
