document.addEventListener('DOMContentLoaded', () => {
    // 1. JSON Data URL එක මෙතනට දාන්න (index.js එකේ තිබ්බ එකම URL එක)
    const DATA_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLiGHBET9ryIfTdodN3PvaSCnhCvpli-XjkrCYZCyaOaUxdeCM1sRyyUNm1mBYsAqTXZhme7D0WLNfWPPSx88UDQEc2GICBKZPSvlE6mkThmCM1tj2VT74jShTfOrvEpR_ZnkBqzeIRm3TyU3rPwhcFlRTaV7DYccbla4GMlKvANFCqpMEN7VffS5HgKGdnhmt97ea5MSovr3q_83wcyLvmbGW19_MD_FzxQk5IvD2idvmZ-Tpl2G7bXd9ExkVu23qxXQzgA5jhY-xkbFtUR9Cbj1St9nlO3bMuyYMrU&lib=MqHVIVDbe7GGrYzAr3eXPOg6Ct9MHB8JG'; // REPLACE with your actual Apps Script URL!
    
    // Caching Variables
    const CACHE_KEY = 'digitalPriceCache';
    
    const container = document.getElementById('plans-container');
    const toolNameHeader = document.getElementById('tool-name-header');
    
    // URL එකෙන් Tool Name සහ Role එක ලබාගැනීම
    const urlParams = new URLSearchParams(window.location.search);
    const toolName = urlParams.get('tool');
    const role = urlParams.get('role');
    const isReseller = role === 'reseller';

    if (!toolName) {
        toolNameHeader.textContent = 'වැරදි සබැඳිය (Invalid Link)';
        container.innerHTML = '<p style="text-align: center;">විස්තර බැලීමට Tool එකක් තෝරන්න.</p>';
        hideLoader();
        return;
    }

    toolNameHeader.textContent = `${toolName} Plans`;
    const detailTitle = document.getElementById('detail-title');
    detailTitle.textContent = isReseller ? `${toolName} - Reseller Prices` : `${toolName} - Customer Prices`;

    // දත්ත පෙන්වන ප්‍රධාන function එක
    function renderPlans(data) {
        // 3. අදාළ Tool එකට විතරක් Plans Filter කිරීම
        const plans = data.filter(item => item.Tool_Name === toolName);

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
            
            // WhatsApp Message එක හදනවා (String Safety Check සමග)
            let messageText = `Hello! I'd like to ${isReseller ? 'Reseller Order' : 'Buy'}: `;
            messageText += `${plan.Tool_Name} | ${plan.Plan_Tier} (${plan.Subscription_Type}) | ${plan.Duration_Months} | LKR ${numericPrice.toLocaleString('en-US')} | Ref: #${plan.Unique_ID}\n\n`;
            messageText += `Please send me the payment details.`;
            
            const safeMessageText = messageText.replace(/'/g, '').replace(/\n/g, '\\n'); // Newline escape
            const encodedMessage = encodeURIComponent(safeMessageText);
            const whatsappLink = `https://wa.me/94784653261?text=${encodedMessage}`;
            
            // Reseller Copy Text (Single Plan)
            const resellerAdText = `🌟 ${plan.Tool_Name} - ${plan.Plan_Tier} (${plan.Subscription_Type}) 🌟\\nDuration: ${plan.Duration_Months}\\nPrice: LKR ${numericPrice.toLocaleString('en-US')}\\nKey Features: ${plan.Key_Features}\\n\\n[Add Your Contact Details Here]`;
            const safeResellerAdText = resellerAdText.replace(/'/g, '').replace(/\n/g, '\\n');

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
                    
                    <!-- 1. Copy Button එක Card එකේම කෙළවරට තැබීම -->
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
                    
                    <!-- 2. Buy Button එක Link එකක් ලෙස තැබීම -->
                    <a href="${whatsappLink}" target="_blank" class="buy-button">
                        Buy via WhatsApp
                    </a>
                </div>
            `;
            container.innerHTML += cardHtml;
        });
    }

    // ----------------------------------------------------
    // CACHING & FETCHING LOGIC
    // ----------------------------------------------------
    
    const cachedItem = localStorage.getItem(CACHE_KEY);

    if (cachedItem) {
        // Cache එකෙන් ක්ෂණිකව Load කිරීම
        const { data } = JSON.parse(cachedItem);
        renderPlans(data);
        hideLoader();
    }

    // පසුබිමින් අලුත් දත්ත Fetch කරන්න (නැත්නම් cache එකක් නැත්නම්)
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response not ok');
            return response.json();
        })
        .then(data => {
            // අලුත් දත්ත ලැබුණාට පස්සේ, Page එක Render කරන්න.
            renderPlans(data);
        })
        .catch(error => {
            console.error('Error fetching latest data:', error);
            if (!cachedItem) {
                container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. පසුව උත්සාහ කරන්න.</p>`;
            }
        })
        .finally(() => {
            // Cache එකෙන් Load නොකළා නම්, Loader එක hide කරන්න
            if (!cachedItem) {
                hideLoader();
            }
        });
});
