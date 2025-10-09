/**
 * Digital Account Price List - Main Script
 * Fetches data directly from the fast Cloudflare Worker and renders product tiles.
 * Includes Loader, Copy, and Toast functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 CONFIGURATION: Cloudflare Worker URL එක මෙහි ඇත.
    const DATA_URL = 'https://price-list-cache-proxy.prasadsandaruwan85.workers.dev/'; 
    // Example: 'https://price-list-cache-proxy.<your-id>.workers.dev/'
    
    // HTML Elements
    const container = document.getElementById('products-container');
    const title = document.getElementById('page-title');

    // URL Parameters (Reseller Check)
    const urlParams = new URLSearchParams(window.location.search);
    const isReseller = urlParams.get('role') === 'reseller';

    if (isReseller) {
        title.textContent = 'Reseller Price List (Private)';
    }

    // ----------------------------------------------------
    // දත්ත පෙන්වීමේ ප්‍රධාන Function
    // ----------------------------------------------------
    function processAndRenderData(data) {
        // Apps Script එකෙන් එන prices array එක ගන්නවා
        const pricesData = (data && data.prices) ? data.prices : data;
        
        if (!Array.isArray(pricesData)) {
            console.error("Invalid data structure received. Prices array missing.");
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ව්‍යුහය දෝෂ සහිතයි. Tiles පෙන්විය නොහැක.</p>`;
            hideLoader();
            return;
        }
        
        // Grouping Logic: Tool Name එකට අනුව අඩුම මිල සොයයි
        const groupedData = pricesData.reduce((acc, item) => {
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

            // Copy Text Logic: සියලුම Plans අඩංගු Text block එක සකස් කරයි
            const allPlansText = tool.plans.map(plan => {
                const price = isReseller ? plan.Reseller_Price_LKR : plan.Customer_Price_LKR;
                const priceLabel = isReseller ? 'Reseller Price' : 'Price';

                return `✅ ${plan.Plan_Tier} (${plan.Subscription_Type}) - ${plan.Duration_Months}\n` +
                       `   LKR ${price.toLocaleString()} (${priceLabel})\n` +
                       `   Features: ${plan.Key_Features}`;
            }).join('\n\n');

            // HTML Quotes සහ Line Breaks සඳහා Escape කරයි
            const safeAllPlansText = allPlansText.replace(/'/g, '’').replace(/\n/g, '\\n');
            
            // Tile HTML Generate Logic:
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
        
        // Render කිරීම අවසන් වූ පසු Loader එක Hide කරන්න
        hideLoader();
    }

    // ----------------------------------------------------
    // 🔥 DATA FETCHING LOGIC (Cloudflare Worker)
    // ----------------------------------------------------
    
    // Worker එකෙන් දත්ත අදින ප්‍රධාන Call එක
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Data ලැබුණු පසු Render කරන්න
            processAndRenderData(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // Loader එක Hide කරන්න
            hideLoader();
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. Cloudflare Worker හෝ Apps Script පරීක්ෂා කරන්න.</p>`;
        });
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