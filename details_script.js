/**
 * Digital Account Price List - Details Page Script
 * Fetches data directly from the fast Cloudflare Worker and displays detailed plan cards for a single tool.
 * Local browser caching (localStorage) is NOT used, relying solely on Cloudflare cache.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 1. CONFIGURATION VARIABLES
    const DATA_URL = 'https://price-list-cache-proxy.prasadsandaruwan85.workers.dev/';
    // CACHE_KEY, CACHE_EXPIRY වැනි දේ අවශ්‍ය නැත.

    const container = document.getElementById('plans-container');
    const toolNameHeader = document.getElementById('tool-name-header');
    
    // URL එකෙන් Tool Name සහ Role එක ලබාගැනීම
    const urlParams = new URLSearchParams(window.location.search);
    const toolName = urlParams.get('tool');
    const role = urlParams.get('role');
    const isReseller = role === 'reseller'; 
    
    // Back Link එක සකස් කිරීම
    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.href = isReseller ? 'index.html?role=reseller' : 'index.html';
    }


    if (!toolName) {
        toolNameHeader.textContent = 'වැරදි සබැඳිය (Invalid Link)';
        container.innerHTML = `<p style="text-align: center;">විස්තර බැලීමට Tool එකක් තෝරන්න.</p>`;
        hideLoader();
        return;
    }

    // Tool Name එක Header එකට දැමීම
    toolNameHeader.textContent = `${toolName} Plans`;
    
    // Header එකේ Title එක වෙනස් කිරීම
    const detailTitle = document.getElementById('detail-title');
    detailTitle.textContent = isReseller ? `${toolName} - Reseller Prices` : `${toolName} - Customer Prices`;

    // ----------------------------------------------------
    // 🔥 RENDER LOGIC
    // ----------------------------------------------------

    // දත්ත පෙන්වන ප්‍රධාන function එක
    function renderPlans(data) {
        // Apps Script එකෙන් prices array එක ගන්නවා (හෝ direct data)
        const pricesData = data.prices || data; 

        // 3. අදාළ Tool එකට විතරක් Plans Filter කිරීම
        const plans = pricesData.filter(item => item.Tool_Name === toolName);

        if (plans.length === 0) {
            container.innerHTML = `<p style="text-align: center;">${toolName} සඳහා plans නොමැත.</p>`;
            return;
        }

        container.innerHTML = ''; // පැරණි content අයින් කරන්න

        // 4. Cards Generate කිරීම
        plans.forEach(plan => {
            // Role එකට අනුව පෙන්විය යුතු මිල තීරණය කිරීම
            const price = isReseller ? plan.Reseller_Price_LKR : plan.Customer_Price_LKR;
            const priceLabel = isReseller ? 'Reseller Price' : 'Price';

            const numericPrice = parseFloat(price);
            
            // WhatsApp Message එක හදනවා
            let messageText = `Hello! I'd like to ${isReseller ? 'Reseller Order' : 'Buy'}: `;
            messageText += `${plan.Tool_Name} | ${plan.Plan_Tier} (${plan.Subscription_Type}) | ${plan.Duration_Months} | LKR ${numericPrice.toLocaleString('en-US')} | Ref: #${plan.Unique_ID}\\n\\nPlease send me the payment details.`;
            
            const encodedMessage = encodeURIComponent(messageText);
            const whatsappLink = `https://wa.me/94784653261?text=${encodedMessage}`;
            
            // Reseller Copy Text (Single Plan)
            const resellerAdText = `🌟 ${plan.Tool_Name} - ${plan.Plan_Tier} (${plan.Subscription_Type}) 🌟\\nDuration: ${plan.Duration_Months}\\nPrice: LKR ${numericPrice.toLocaleString('en-US')}\\nKey Features: ${plan.Key_Features}\\n\\n[Add Your Contact Details Here]`;
            const safeResellerAdText = resellerAdText.replace(/'/g, '’'); // Single quotes වලින් escape කරයි

            const copyButtonHtml = isReseller ? `
                <button class="copy-plan-btn" 
                        onclick="event.stopPropagation(); event.preventDefault(); copyToClipboard('${safeResellerAdText}')">
                    <svg class="copy-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                    </svg>
                </button>
            ` : '';

            const cardHtml = `
                <div class="plan-card ${plan.Subscription_Type.toLowerCase()}">
                    
                    ${copyButtonHtml}

                    <div class="header-section">
                        <span class="plan-type">${plan.Subscription_Type}</span>
                        <span class="duration">${plan.Duration_Months}</span>
                    </div>
                    
                    <h2>${plan.Plan_Tier} Plan</h2>
                    
                    <div class="price-section">
                        <span class="price-label">${priceLabel}:</span>
                        <span class="price-value">LKR ${numericPrice.toLocaleString('en-US')}</span>
                    </div>
                    
                    <div class="features-section">
                        <p>${plan.Key_Features}</p>
                        <span class="status ${plan.Status.toLowerCase().replace(/\s/g, '_')}">${plan.Status}</span>
                    </div>
                    
                    <a href="${whatsappLink}" target="_blank" class="buy-button">
                        Buy via WhatsApp
                    </a>
                </div>
            `;
            container.innerHTML += cardHtml;
        });
        
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
            renderPlans(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // Loader එක Hide කරන්න
            hideLoader();
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. කරුණාකර පසුව උත්සාහ කරන්න.</p>`;
        });
});