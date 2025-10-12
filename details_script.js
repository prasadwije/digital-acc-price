/**
 * Digital Account Price List - Details Page Script (Final Clean Version)
 * Fetches data (prioritizing in-memory cache) and displays detailed plan cards for a single tool.
 */

// Global functions (extractPriceAndSymbol, hideLoader, etc.) are assumed to be available from script.js

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 1. CONFIGURATION VARIABLES
    const DATA_URL = 'https://price-list-cache-proxy.prasadsandaruwan85.workers.dev/';
    
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
        // Back Link එක නිවැරදි Reseller/Customer URL එකට යවයි
        backLink.href = isReseller ? 'index.html?role=reseller' : 'index.html';
    }


    if (!toolName) {
        toolNameHeader.textContent = 'වැරදි සබැඳිය (Invalid Link)';
        container.innerHTML = '<p style="text-align: center;">විස්තර බැලීමට Tool එකක් තෝරන්න.</p>';
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
        const pricesData = data.prices || data; 

        // 3. අදාළ Tool එකට විතරක් Plans Filter කිරීම
        const plans = pricesData.filter(item => item.Tool_Name.replace(/\n/g, '').trim() === toolName.replace(/\n/g, '').trim());

        if (plans.length === 0) {
            container.innerHTML = `<p style="text-align: center;">${toolName} සඳහා plans නොමැත.</p>`;
            return;
        }

        container.innerHTML = ''; // පැරණි content අයින් කරන්න

        // 4. Cards Generate කිරීම
        plans.forEach(plan => {
            // Price Helper Function එකෙන් Price/Symbol ගන්නවා (script.js එකෙන් Load වේ)
            const resellerPriceInfo = extractPriceAndSymbol(plan.Reseller_Price_LKR);
            const customerPriceInfo = extractPriceAndSymbol(plan.Customer_Price_LKR);

            const price = isReseller ? resellerPriceInfo.value : customerPriceInfo.value;
            const symbol = isReseller ? resellerPriceInfo.symbol : customerPriceInfo.symbol;
            
            const priceLabel = isReseller ? 'Reseller Price' : 'Price';

            const numericPrice = price;
            const numericCustomerPrice = customerPriceInfo.value;
            
            // Symbol Prefix/Suffix Logic
            const symbolIsPrefix = symbol.startsWith('$') || symbol.startsWith('€') || symbol.toLowerCase().startsWith('rs.');

            const resellerDisplayPrice = symbolIsPrefix 
                ? `${symbol}${numericPrice.toLocaleString('en-US')}`
                : `${numericPrice.toLocaleString('en-US')}${symbol}`;
            
            const customerDisplayPrice = customerPriceInfo.symbol.startsWith('$') || customerPriceInfo.symbol.startsWith('€') || customerPriceInfo.symbol.toLowerCase().startsWith('rs.')
                ? `${customerPriceInfo.symbol}${numericCustomerPrice.toLocaleString('en-US')}`
                : `${numericCustomerPrice.toLocaleString('en-US')}${customerPriceInfo.symbol}`;


            // WhatsApp Message
            let messageText = `Hello! I'd like to ${isReseller ? 'Reseller Order' : 'Buy'}: `;
            messageText += `${plan.Tool_Name} | ${plan.Plan_Tier} | ${plan.Duration_Months} | ${resellerDisplayPrice} | Ref: #${plan.Unique_ID}\n\nPlease send me the payment details.`;
            
            const encodedMessage = encodeURIComponent(messageText);
            const whatsappLink = `https://wa.me/94784653261?text=${encodedMessage}`;
            
            // Reseller Copy Text (Tool Name එක උඩින්ම එකතු කරයි)
            const toolNameHeading = `🔥 ${plan.Tool_Name} - Plan Details 🔥\\n\\n`; 

            const resellerAdText = `${toolNameHeading}🌟 ${plan.Plan_Tier} (${plan.Subscription_Type}) 🌟\\n` +
                                   `Duration: ${plan.Duration_Months}\\n` +
                                   `Normal Price: ${customerDisplayPrice}\\n` + 
                                   `Your Price: ${resellerDisplayPrice}\\n` +    
                                   `Key Features: ${plan.Key_Features}\\n\\n[Add Your Contact Details Here]`;
            
            // 💥 FIX: Copy Text එකේ Quotes (Single/Double) සහ Newlines (\\n) නිවැරදිව Escape කිරීම
            const safeResellerAdText = resellerAdText.replace(/'/g, '\\\'').replace(/"/g, '\\"').replace(/\n/g, '\\n'); 


            // Copy Button HTML
            const copyButtonHtml = `
                <button class="copy-plan-btn ${!isReseller ? 'hidden-copy-btn' : ''}" 
                        onclick="event.stopPropagation(); event.preventDefault(); copyToClipboard('${safeResellerAdText}')"
                        title="${isReseller ? 'Copy Plan Details' : 'Copy for Customer'}">
                    <svg class="copy-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                    </svg>
                </button>
            `;

            const cardHtml = `
                <div class="plan-card ${plan.Subscription_Type.toLowerCase()}">
                    
                    ${copyButtonHtml}

                    <div class="header-section">
                        <span class="plan-type">${plan.Subscription_Type}</span>
                        <span class="duration">${plan.Duration_Months}</span>
                    </div>
                    
                    <h2>${plan.Plan_Tier}</h2>
                    
                    <!-- FINAL PRICE DISPLAY FIX START: Show Normal Price above Reseller Price -->
                    ${isReseller ? 
                        `<div class="price-section">
                            <span class="price-label">Normal Price:</span>
                            <span class="original-price-display">${customerDisplayPrice}</span>
                        </div>
                        <div class="reseller-price-row">
                            <span class="price-label">${priceLabel}:</span>
                            <span class="price-value reseller-value">${resellerDisplayPrice}</span>
                        </div>`
                        :
                        `<div class="price-section">
                            <span class="price-label">${priceLabel}:</span>
                            <span class="price-value">${resellerDisplayPrice}</span>
                        </div>`
                    }
                    <!-- FINAL PRICE DISPLAY FIX END -->
                    
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
        
        hideLoader();
    }

    // FINAL FETCH LOGIC (Cloudflare Caching)
    if (window.globalPriceData) {
        // In-Memory Cache එකෙන් ක්ෂණිකව Load කරයි
        renderPlans(window.globalPriceData);
    } else {
        // Cache එකක් නැත්නම් අලුතින් Load කරන්න
        fetch(DATA_URL)
            .then(response => {
                if (!response.ok) throw new Error('Network response not ok');
                return response.json();
            })
            .then(data => {
                // Data Memory එකේ Save කරයි
                window.globalPriceData = data; 
                renderPlans(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. Cloudflare Cache එක පරීක්ෂා කරන්න.</p>`;
            })
            .finally(() => {
                 hideLoader();
            });
    }

});
