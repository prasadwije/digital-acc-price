/**
 * Digital Account Price List - Main Script (Memory Cache)
 * Fetches data from Cloudflare Proxy and stores it in window.globalPriceData for fast internal navigation.
 */

// Global variable to store data in memory (for fast internal navigation)
window.globalPriceData = window.globalPriceData || null;

// Global variable to store current loading state (prevents multiple fetches)
window.isFetchingData = window.isFetchingData || false;

// Global functions (hideLoader, copyToClipboard, etc.) are assumed to be in global scope from this file.

document.addEventListener('DOMContentLoaded', () => {
    const DATA_URL = 'https://price-list-cache-proxy.prasadsandaruwan85.workers.dev/';

    const container = document.getElementById('products-container');
    const title = document.getElementById('page-title');

    const urlParams = new URLSearchParams(window.location.search);
    const isReseller = urlParams.get('role') === 'reseller';

    if (isReseller) {
        if (title) title.textContent = 'Reseller Price List (Private)';
    }

    // ----------------------------------------------------
    // දත්ත පෙන්වීම සහ Rendering Logic
    // ----------------------------------------------------
    function processAndRenderData(data) {
        if (!container) {
            return;
        }
        
        const pricesData = (data && data.prices) ? data.prices : data; 
        
        if (!Array.isArray(pricesData)) {
            console.error("Invalid data structure received. Prices array missing.");
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ව්‍යුහය දෝෂ සහිතයි. Tiles පෙන්විය නොහැක.</p>`;
            hideLoader();
            return;
        }
        
        const groupedData = pricesData.reduce((acc, item) => {
            const customerPriceInfo = extractPriceAndSymbol(item.Customer_Price_LKR);
            const resellerPriceInfo = extractPriceAndSymbol(item.Reseller_Price_LKR);

            const isFallback = resellerPriceInfo.value <= 0;
            
            const currentPrice = isFallback ? customerPriceInfo.value : resellerPriceInfo.value;
            const currentSymbol = isFallback ? customerPriceInfo.symbol : resellerPriceInfo.symbol;
            
            if (!acc[item.Tool_Name] || currentPrice < acc[item.Tool_Name].minPrice) {
                acc[item.Tool_Name] = {
                    minPrice: currentPrice,
                    symbol: currentSymbol,
                    firstPlan: item,
                    plans: [],
                    isFallback: isFallback // Fallback Price ද කියලා Flag කරනවා
                };
            }
            acc[item.Tool_Name].plans.push(item);
            return acc;
        }, {});

        container.innerHTML = ''; 

        // Tiles Render කිරීම
        for (const toolName in groupedData) {
            const tool = groupedData[toolName];
            const firstPlan = tool.firstPlan;

            const cleanToolName = toolName.replace(/\n/g, '').trim(); 

            // Copy Text Logic
            const toolNameHeading = `✅ ${cleanToolName} - Price List\\n\\n`; 

            const allPlansTextBody = tool.plans.map(plan => {
                const priceInfo = isReseller 
                    ? extractPriceAndSymbol(plan.Reseller_Price_LKR) 
                    : extractPriceAndSymbol(plan.Customer_Price_LKR);
                
                const customerPriceInfo = extractPriceAndSymbol(plan.Customer_Price_LKR);


                const priceLabel = isReseller ? 'Reseller Price' : 'Price';

                const displayPrice = customerPriceInfo.symbol.startsWith('$') || customerPriceInfo.symbol.startsWith('€') || customerPriceInfo.symbol.toLowerCase().startsWith('rs.')
                    ? `${priceInfo.symbol}${priceInfo.value.toLocaleString()}`
                    : `${priceInfo.value.toLocaleString()}${priceInfo.symbol}`;

                const customerDisplayPrice = customerPriceInfo.symbol.startsWith('$') || customerPriceInfo.symbol.startsWith('€') || customerPriceInfo.symbol.toLowerCase().startsWith('rs.')
                    ? `${customerPriceInfo.symbol}${customerPriceInfo.value.toLocaleString()}`
                    : `${customerPriceInfo.value.toLocaleString()}${customerPriceInfo.symbol}`;


                return `➡️ ${plan.Plan_Tier} (${plan.Subscription_Type}) - ${plan.Duration_Months}\n` +
                        (isReseller ? `   Normal Price: ${customerDisplayPrice}\n` : '') + 
                        `   ${priceLabel}: ${displayPrice}\n` +
                        `   Features: ${plan.Key_Features}`;
            }).join('\\n\\n');

            const allPlansText = toolNameHeading + allPlansTextBody + `\\n\\n[Add Your Contact Details Here]`;

            const safeAllPlansText = allPlansText.replace(/'/g, '’').replace(/\n/g, '\\n');
            
            // Tile HTML Generate Logic
            const copyButtonHtml = `
                <button class="copy-all-btn ${!isReseller ? 'hidden-copy-btn' : ''}" 
                        onclick="event.stopPropagation(); event.preventDefault(); copyToClipboard('${safeAllPlansText}')" 
                        title="${isReseller ? 'Copy all plans for Reseller' : 'Copy for Customer'}">
                    <svg class="copy-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                    </svg>
                </button>
            `;

            const detailsLink = `details.html?tool=${encodeURIComponent(cleanToolName)}&role=${isReseller ? 'reseller' : 'customer'}`;
            
            const tileClasses = `product-tile ${tool.isFallback ? 'fallback-price-tile' : ''}`; // Fallback Class එක එකතු කරයි
            
            const symbolIsPrefix = tool.symbol.startsWith('$') || tool.symbol.startsWith('€') || tool.symbol.toLowerCase().startsWith('rs.');
            const symbolDisplay = symbolIsPrefix ? tool.symbol : '';
            const priceDisplay = symbolIsPrefix ? tool.minPrice.toLocaleString() : `${tool.minPrice.toLocaleString()}${tool.symbol}`;
            
            
            const tileHtml = `
                <a href="${detailsLink}" class="${tileClasses}">
                    ${copyButtonHtml}
                    
                    <img src="${firstPlan.Image_URL}" alt="${toolName} Logo">
                    <h3>${toolName}</h3> 
                    <p class="summary-price">Starting from ${symbolDisplay}${priceDisplay}</p>
                </a>
            `;
            container.innerHTML += tileHtml;
        }
        
        hideLoader();
        window.isFetchingData = false; // Fetching අවසන් බව සලකුණු කරයි
    }

    // ----------------------------------------------------
    // FINAL FETCH LOGIC (Cloudflare Caching)
    // ----------------------------------------------------
    function fetchLatestData() {
        if (window.isFetchingData) return; // දැනටමත් Fetch කරනවා නම් නවත්වයි

        window.isFetchingData = true; // Fetching ආරම්භ කරයි
        
        fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.json();
        })
        .then(data => {
            // Memory එකේ Data Save කරයි
            window.globalPriceData = data; 
            
            // Data ලැබුණාට පස්සේ Render කරනවා
            processAndRenderData(data); 
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. Cloudflare Cache එක පරීක්ෂා කරන්න.</p>`;
        })
        .finally(() => {
             // Error ආවත්, නැතත් අවසන් වූ පසු Flag එක අයින් කරයි
             window.isFetchingData = false;
             // Error එකකදී hideLoader() call වීම catch block එකේ handle වේ.
        });
    }

    // Initial Load
    if (window.globalPriceData) {
        // 🔥 FIX: Memory එකේ Data තියෙනවා නම් ක්ෂණිකව Load කරයි
        processAndRenderData(window.globalPriceData);
    } else {
        // Cache එකක් නැත්නම් අලුතින් Load කරන්න
        fetchLatestData();
    }
});


// ***************************************************************
// 💡 GLOBAL FUNCTIONS (Toast, Loader, and Price Helper)
// ***************************************************************

/**
 * Price String එකෙන් Numeric Value එක සහ Currency Symbol/Suffix එක වෙන් කරයි.
 * මේකේදී Symbol එකේ අක්ෂර කීපයක් වුණත් ගනී.
 * @param {string} priceString
 * @returns {{value: number, symbol: string}}
 */
function extractPriceAndSymbol(priceString) {
    if (!priceString) return { value: 0, symbol: '' };
    
    const cleanedString = priceString.toString().replace(/\s/g, ''); 
    
    // FINAL FIX REGEX: අංක සමූහයට ඉස්සරහින් හෝ පස්සෙන් තියෙන ඕනෑම Character Group එකක් Symbol ලෙස ගනී.
    const match = cleanedString.match(/^([^0-9]+)?([0-9,]+)([0-9,.]+)?([^0-9]+)?$/);

    if (!match) return { value: parseFloat(priceString) || 0, symbol: '' };

    const symbolBefore = match[1] || '';
    const numberPart = match[2];
    const decimalPart = match[3] || '';
    const symbolAfter = match[4] || '';

    // Comma (,) අයින් කරලා, Decimal (.) එකත් එක්ක Value එක ගනී
    const value = parseFloat(numberPart.replace(/,/g, '') + decimalPart) || 0; 
    const symbol = (symbolBefore + symbolAfter).trim();

    return { 
        value: value, 
        symbol: symbol
    };
}

/**
 * Loading Screen එක සඟවයි. Data Load වූ පසු ක්‍රියාත්මක වේ.
 */
function hideLoader() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('hidden');
    }
}

/**
 * ඕනෑම Text එකක් Clipboard එකට Copy කරයි.
 */
function copyToClipboard(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text.replace(/\\n/g, '\n'); 
    document.body.appendChild(tempInput);
    
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); 
    document.execCommand('copy');
    
    document.body.removeChild(tempInput);

    showToast('Copied to clipboard!');
}

/**
 * Auto-hiding Toast Notification එක පෙන්වයි.
 */
function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}
