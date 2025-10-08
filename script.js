document.addEventListener('DOMContentLoaded', () => {
    const DATA_URL = 'https://script.google.com/macros/s/AKfycbyefFSmfSyLRqrQOoTbv5dKT0ncljBJs_uN-KHka98ZnUc9IoYvrLBDkFyII1-7ScS89A/exec';
    const CACHE_KEY = 'digitalPriceCache';
    const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

    const container = document.getElementById('products-container');
    const title = document.getElementById('page-title');

    const urlParams = new URLSearchParams(window.location.search);
    const isReseller = urlParams.get('role') === 'reseller';

    if (isReseller) {
        title.textContent = 'Reseller Price List (Private)';
    }

    // ----------------------------------------------------
    // දත්ත පෙන්වීම සහ Caching Logic එක ක්‍රියාත්මක කිරීම
    // ----------------------------------------------------
    function processAndRenderData(data, isCached) {
        // Apps Script එකෙන් එන prices array එක ගන්නවා
        const pricesData = (data && data.prices) ? data.prices : data;
        
		if (!Array.isArray(pricesData)) {
            console.error("Invalid data structure received. Prices array missing.");
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ව්‍යුහය දෝෂ සහිතයි. Tiles පෙන්විය නොහැක.</p>`;
            hideLoader();
            return;
        }
		
        const groupedData = pricesData.reduce((acc, item) => {
            // Grouping Logic...
            const currentPrice = isReseller ? item.Reseller_Price_LKR : item.Customer_Price_LKR;
            
            if (!acc[item.Tool_Name] || currentPrice < acc[item.Tool_Name].minPrice) {
                acc[item.Tool_Name] = {
                    minPrice: currentPrice,
                    firstPlan: item,
                    plans: []
                };
            }
            acc[item.Tool_Name].plans.push(item);
            return acc;
        }, {});

        container.innerHTML = ''; 

        for (const toolName in groupedData) {
            const tool = groupedData[toolName];
            const firstPlan = tool.firstPlan;

            // ... (Copy Text Logic) ...
            const allPlansText = tool.plans.map(plan => {
                const price = isReseller ? plan.Reseller_Price_LKR : plan.Customer_Price_LKR;
                const priceLabel = isReseller ? 'Reseller Price' : 'Price';

                return `✅ ${plan.Plan_Tier} (${plan.Subscription_Type}) - ${plan.Duration_Months}\n` +
                       `   LKR ${price.toLocaleString()} (${priceLabel})\n` +
                       `   Features: ${plan.Key_Features}`;
            }).join('\n\n');

            const safeAllPlansText = allPlansText.replace(/'/g, '’').replace(/\n/g, '\\n');
            
            // ... (Tile HTML Generate Logic) ...
            const copyButtonHtml = isReseller ? `
                <button class="copy-all-btn" 
                        onclick="event.stopPropagation(); event.preventDefault(); copyToClipboard('${safeAllPlansText}')">
                    <svg class="copy-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                    </svg>
                </button>
            ` : '';

            const detailsLink = `details.html?tool=${encodeURIComponent(toolName)}&role=${isReseller ? 'reseller' : 'customer'}`;
            
            const tileHtml = `
                <a href="${detailsLink}" class="product-tile">
                    ${isReseller ? copyButtonHtml : ''}
                    
                    <img src="${firstPlan.Image_URL}" alt="${toolName} Logo">
                    <h3>${toolName}</h3>
                    <p class="summary-price">Starting from LKR ${tool.minPrice.toLocaleString()}</p>
                </a>
            `;
            container.innerHTML += tileHtml;
        }

        // Cache එකෙන් Load කළා නම්, Loader එක hide කරලා පසුබිමින් Update කරන්න
        if (isCached && isCached !== 'initial') {
             hideLoader();
             fetchLatestData();
        }
    }

    // පසුබිමින් අලුත් දත්ත Fetch කරන function එක
    function fetchLatestData() {
        fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.json();
        })
        .then(data => {
            const cachedItem = localStorage.getItem(CACHE_KEY);
            const currentCacheVersion = cachedItem ? JSON.parse(cachedItem).version : '0.0';

            // Version එක Check කරන්න
            if (data.version && data.version > currentCacheVersion) {
                // අලුත් දත්ත Cache කරන්න
                // ... (Cache Saving Logic) ...
                
                // අලුත් දත්ත වලින් Page එක නැවත Render කරන්න
                processAndRenderData(data, false); 
            } else if (!currentCacheVersion) {
                 // මුලින්ම Cache එකක් නැතිනම්, ලැබුණු දත්ත වලින් Load කරන්න
                // ... (Cache Saving Logic) ...
                processAndRenderData(data, false);
            }
        })
        .catch(error => {
            console.error('Error fetching latest data:', error);
            // 🔥 Error එකක් ආවත් Loader එක Hide කරන්න
            hideLoader();
            // Cache එකක් නැත්නම් User ට error එක පෙන්වන්න
            const cachedItem = localStorage.getItem(CACHE_KEY);
            if (!cachedItem) {
                container.innerHTML = `<p style="color: red; text-align: center;">අන්තර්ජාල සම්බන්ධතාව දෝෂ සහිතයි හෝ Apps Script URL වෙත පිවිසීමට නොහැක.</p>`;
            }
        });
    }

    // මුලින්ම Cache එකෙන් දත්ත Load කිරීම
    const cachedItem = localStorage.getItem(CACHE_KEY);
    
    if (cachedItem) {
        const { data, timestamp, version } = JSON.parse(cachedItem);
        const expiryTime = CACHE_EXPIRY;

        if (Date.now() < timestamp + expiryTime) {
            // Cache එක වලංගු නම්, ක්ෂණිකව Load කරලා, පසුබිමින් Update කරන්න
            processAndRenderData({prices: data, version: version}, 'initial'); 
            // 🔥 FIX: Initial Load එකෙන් පස්සේ Loader එක Hide කරන්න
            hideLoader(); 
        } else {
            // Cache එක කල් ඉකුත් වෙලා නම්, අලුතින් Load කරන්න
            fetchLatestData();
        }
    } else {
        // Cache එකක් නැත්නම්, Loader එක තියලා අලුතින් Load කරන්න
        fetchLatestData();
    }
});


// ***************************************************************
// 💡 GLOBAL FUNCTIONS (Toast and Loader)
// ***************************************************************

/**
 * Loading Screen එක සඟවයි. Data Load වූ පසු ක්‍රියාත්මක වේ.
 */
function hideLoader() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        // Transition එකක් සහිතව Loader එක ඉවත් කිරීම
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
