/**
 * Digital Account Price List - Main Script (Cloudflare Optimized)
 * Fetches data from Cloudflare Proxy (Fast Cache) and renders the home page tiles.
 */

// ***************************************************************
// 💡 GLOBAL FUNCTIONS (Toast, Loader, and Price Helper)
// THESE MUST BE IN GLOBAL SCOPE FOR details_script.js TO ACCESS THEM
// ***************************************************************

/**
 * Price String එකෙන් Numeric Value එක සහ Currency Symbol/Suffix එක වෙන් කරයි.
 * @param {string} priceString
 * @returns {{value: number, symbol: string}}
 */
function extractPriceAndSymbol(priceString) {
    if (!priceString) return { value: 0, symbol: '' };
    
    // සියලුම හිස්තැන් අයින් කරයි
    const cleanedString = priceString.toString().replace(/\s/g, ''); 
    
    // FINAL FIX REGEX: 
    // Group 1: Symbol Before Number (e.g., Rs., $)
    // Group 2: Number Part (e.g., 4,500.50) - (,) සහ (.) දශමස්ථාන/කොමා විය හැක
    // Group 3: Symbol After Number (e.g., /USDT, /-)
    const match = cleanedString.match(/^([^0-9]+)?([0-9.,]+)([^0-9]+)?$/);

    if (!match) return { value: parseFloat(priceString) || 0, symbol: '' };

    const symbolBefore = match[1] || '';
    const rawValue = match[2];
    const symbolAfter = match[3] || '';

    // Comma remove කරලා float එකක් විදියට ගන්නවා (Final value සඳහා)
    const value = parseFloat(rawValue.replace(/,/g, '')) || 0; 

    // Symbol එක එකතු කරලා Return කරයි (Symbol එකේ හිස්තැන් නැත)
    return { 
        value: value, 
        symbol: (symbolBefore + symbolAfter).trim() 
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
    // 1. Textarea එකක් හදනවා
    const tempInput = document.createElement('textarea');
    // HTML Escape කරපු Line Breaks සැබෑ Line Breaks බවට පත් කරයි
    tempInput.value = text.replace(/\\n/g, '\n'); 
    document.body.appendChild(tempInput);
    
    // 2. Text එක Select කරලා Copy කරනවා
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // Mobile Support
    document.execCommand('copy');
    
    // 3. Textarea එක Remove කරනවා
    document.body.removeChild(tempInput);

    // 4. Notification එක පෙන්වන්න
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
        
        // තත්පර 3 කට පසු ස්වයංක්‍රීයව අතුරුදහන් වීමට
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ***************************************************************
// 💡 MAIN EXECUTION LOGIC
// ***************************************************************

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 CONFIGURATION VARIABLES
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
        return; // Container එක නැත්නම් function එක නවත්වනවා
        }
        const pricesData = (data && data.prices) ? data.prices : data; 
        
        if (!Array.isArray(pricesData)) {
            console.error("Invalid data structure received. Prices array missing.");
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ව්‍යුහය දෝෂ සහිතයි. Tiles පෙන්විය නොහැක.</p>`;
            hideLoader();
            return;
        }
        
        // Data Grouping Logic
        const groupedData = pricesData.reduce((acc, item) => {
            
            const customerPriceInfo = extractPriceAndSymbol(item.Customer_Price_LKR);
            const resellerPriceInfo = extractPriceAndSymbol(item.Reseller_Price_LKR);
            
            const currentPrice = isReseller ? resellerPriceInfo.value : customerPriceInfo.value;
            const currentSymbol = isReseller ? resellerPriceInfo.symbol : customerPriceInfo.symbol;
            
            if (!acc[item.Tool_Name] || currentPrice < acc[item.Tool_Name].minPrice) {
                acc[item.Tool_Name] = {
                    minPrice: currentPrice,
                    symbol: currentSymbol, 
                    firstPlan: item,
                    plans: []
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

            // FIX 1: Tool Name එකේ Newline (නව පේළි) සහ අනවශ්‍ය හිස්තැන් ඉවත් කිරීම
            const cleanToolName = toolName.replace(/\n/g, '').trim(); 

            // FIX 2: Copy Text Logic - Tool Name Header එක මුලින්ම සකස් කරයි
            const toolNameHeading = `✅ ${cleanToolName} - Price List\\n\\n`; 

            // All Plans Text Body එක හදනවා (Header එක නැතිව)
            const allPlansTextBody = tool.plans.map(plan => {
                const resellerPriceInfo = extractPriceAndSymbol(plan.Reseller_Price_LKR);
                const customerPriceInfo = extractPriceAndSymbol(plan.Customer_Price_LKR);
                
                // Reseller's Price Logic (Discount)
                const priceLabel = 'Reseller Price';
                const resellerDisplayPrice = customerPriceInfo.symbol.startsWith('$') || customerPriceInfo.symbol.toLowerCase().startsWith('rs.')
                    ? `${resellerPriceInfo.symbol}${resellerPriceInfo.value.toLocaleString()}`
                    : `${resellerPriceInfo.value.toLocaleString()}${resellerPriceInfo.symbol}`;

                // Normal Price Logic
                const customerDisplayPrice = customerPriceInfo.symbol.startsWith('$') || customerPriceInfo.symbol.toLowerCase().startsWith('rs.')
                    ? `${customerPriceInfo.symbol}${customerPriceInfo.value.toLocaleString()}`
                    : `${customerPriceInfo.value.toLocaleString()}${customerPriceInfo.symbol}`;


                // එක් Plan එකක විස්තර
                return `🔥 ${plan.Plan_Tier} (${plan.Subscription_Type}) - ${plan.Duration_Months}\n` +
                        `   Normal Price: ${customerDisplayPrice}\n` + // 🔥 FIX: Normal Price එක
                        `   Your Price: ${resellerDisplayPrice}\n` + // 🔥 FIX: Reseller Price එක
                        `   Features: ${plan.Key_Features}`;
            }).join('\\n\\n'); // Line breaks 2ක් තබයි

            // FINAL COPY TEXT: Header + Body එක එකතු කරයි
            const allPlansText = toolNameHeading + allPlansTextBody + `\\n\\n[Add Your Contact Details Here]`;

            // FIX 3: Escape Logic (Copy Button සඳහා)
            const safeAllPlansText = allPlansText.replace(/'/g, '’').replace(/"/g, '”').replace(/\n/g, '\\n');
            
            // FIX 4 & 6: Copy Button HTML (Unconditional Generation + Conditional Hiding)
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
            
            // FINAL PRICE DISPLAY LOGIC FOR TILE
            const symbolIsPrefix = tool.symbol.startsWith('$') || tool.symbol.startsWith('€') || tool.symbol.toLowerCase().startsWith('rs.');
            const displayPrice = tool.minPrice.toLocaleString();
            
            const finalPriceHtml = symbolIsPrefix 
                ? `${tool.symbol}${displayPrice}` // Prefix: $1,000
                : `${displayPrice}${tool.symbol}`; // Suffix: 1,000/-
            
            const tileHtml = `
                <a href="${detailsLink}" class="product-tile">
                    ${copyButtonHtml}
                    
                    <img src="${firstPlan.Image_URL}" alt="${toolName} Logo">
                    <h3>${toolName}</h3> 
                    <!-- FIX: Symbol prefix/suffix Logic -->
                    <p class="summary-price">Starting from ${finalPriceHtml}</p>
                </a>
            `;
            container.innerHTML += tileHtml;
        }
        
        // Loader එක Hide කරන්න
        hideLoader();
    }

    // ----------------------------------------------------
    // FINAL FETCH LOGIC (Cloudflare Caching)
    // ----------------------------------------------------
    function fetchLatestData() {
        fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.json();
        })
        .then(data => {
            // Data ලැබුණාට පස්සේ Render කරනවා
            processAndRenderData(data); 
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. Cloudflare Cache එක පරීක්ෂා කරන්න.</p>`;
            hideLoader();
        });
    }

    // Initial Call
    fetchLatestData();
});
