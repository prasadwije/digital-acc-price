// [details_script.js file එකේ මුල් කොටස වෙනස් කරන්න]

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 1. CONFIGURATION VARIABLES
    const DATA_URL = 'https://script.google.com/macros/s/AKfycbyefFSmfSyLRqrQOoTbv5dKT0ncljBJs_uN-KHka98ZnUc9IoYvrLBDkFyII1-7ScS89A/exec';
    const CACHE_KEY = 'digitalPriceCache';
    // CACHE_EXPIRY script.js එකෙන් පාලනය වේ

    const container = document.getElementById('plans-container');
    const toolNameHeader = document.getElementById('tool-name-header');
    
    // URL එකෙන් Tool Name සහ Role එක ලබාගැනීම
    const urlParams = new URLSearchParams(window.location.search);
    const toolName = urlParams.get('tool');
    const role = urlParams.get('role');
    const isReseller = role === 'reseller'; 
    
    // Back Link එක සකස් කිරීම
    const backLink = document.querySelector('.back-link'); // Class එක භාවිත කරයි
    if (backLink) {
        backLink.href = isReseller ? 'index.html?role=reseller' : 'index.html';
    }


    if (!toolName) {
        toolNameHeader.textContent = 'වැරදි සබැඳිය (Invalid Link)';
        container.innerHTML = '<p style="text-align: center;">විස්තර බැලීමට Tool එකක් තෝරන්න.</p>';
        hideLoader(); // Error එකකදී Loader එක Hide කරන්න
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
            // Line break fix: \n එකක් වෙනුවට \\n ලෙස යැවිය යුතුයි
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
        hideLoader(); // Render වුණාට පස්සේ Loader එක Hide කරනවා
    }

    // ----------------------------------------------------
    // 🔥 CACHING & FETCHING LOGIC
    // ----------------------------------------------------
    
    const cachedItem = localStorage.getItem(CACHE_KEY);

    if (cachedItem) {
        const { data, version } = JSON.parse(cachedItem);
        // Cache එකෙන් ක්ෂණිකව Load කිරීම
        renderPlans({prices: data, version: version});
        hideLoader(); // 🔥 Cache තිබේ නම් වහාම Loader එක Hide කරයි
    }

    // Cache එකක් තිබුණත් නැතත්, අලුත් දත්ත Fetch කරන්න (පසුබිමෙන්)
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.json();
        })
        .then(data => {
            const cachedItem = localStorage.getItem(CACHE_KEY);
            const currentCacheVersion = cachedItem ? JSON.parse(cachedItem).version : '0.0';

            // Version එක Check කරන්න - අලුත් Version එකක් නම් Cache කරන්න
            if (!cachedItem || (data.version && data.version > currentCacheVersion)) {
                
                // අලුත් දත්ත Cache කරන්න
                const cacheData = {
                    data: data.prices, // prices array එක විතරක් save කරන්න
                    version: data.version,
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                
                // අලුත් දත්ත වලින් Page එක Render කරන්න
                renderPlans(data);
            }
            // 🔥 Loader එක Hide කරන්නේ මෙතන නෙවෙයි, මුලින්ම Cache Load කළේ නම්
            
        })
        .catch(error => {
            console.error('Error fetching latest data or rendering:', error);
            if (!cachedItem) {
                container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. පසුව උත්සාහ කරන්න.</p>`;
            }
        })
        .finally(() => {
             // 🔥 Error එකක් ආවත්, Cache තිබුණත් නැතත්, අවසානයේ Loader එක Hide කරයි
             if (!cachedItem) { // Cache එකක් මුලින්ම තිබුණේ නැත්නම් විතරක් Loader එක Hide කරයි
                 hideLoader();
             }
        });

});
