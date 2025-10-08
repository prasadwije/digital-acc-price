document.addEventListener('DOMContentLoaded', () => {
    // 🔥 1. Variables මුලින්ම Define කිරීම
    // ඔබේ Apps Script URL එක මෙතනට දාන්න
    const DATA_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLiGHBET9ryIfTdodN3PvaSCnhCvpli-XjkrCYZCyaOaUxdeCM1sRyyUNm1mBYsAqTXZhme7D0WLNfWPPSx88UDQEc2GICBKZPSvlE6mkThmCM1tj2VT74jShTfOrvEpR_ZnkBqzeIRm3TyU3rPwhcFlRTaV7DYccbla4GMlKvANFCqpMEN7VffS5HgKGdnhmt97ea5MSovr3q_83wcyLvmbGW19_MD_FzxQk5IvD2idvmZ-Tpl2G7bXd9ExkVu23qxXQzgA5jhY-xkbFtUR9Cbj1St9nlO3bMuyYMrU&lib=MqHVIVDbe7GGrYzAr3eXPOg6Ct9MHB8JG'; 
    const container = document.getElementById('products-container');
    const title = document.getElementById('page-title');

    const urlParams = new URLSearchParams(window.location.search);
    const isReseller = urlParams.get('role') === 'reseller';

    // 2. Safety Check එකක් දාමු: title Element එක තියෙනවද කියලා බලනවා
    if (isReseller && title) { 
        title.textContent = 'Reseller Price List (Private)';
    }

    // 3. Container Element එක තියෙනවද කියලා Check කිරීම
    if (!container) {
        console.error("Error: Products container not found (id='products-container'). Check index.html.");
        return; 
    }

    // 4. JSON Data fetch කරනවා
    fetch(DATA_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            
            // Grouping Logic එක සරල කරනවා
            const groupedData = data.reduce((acc, item) => {
                const currentPrice = isReseller ? item.Reseller_Price_LKR : item.Customer_Price_LKR;
                
                // Grouping Logic
                if (!acc[item.Tool_Name]) {
                    acc[item.Tool_Name] = {
                        minPrice: currentPrice,
                        firstPlan: item,
                        allPlans: [] // මේ Tool එකේ සියලුම Plans ගබඩා කරන්න
                    };
                }
                
                // Min Price update
                if (currentPrice < acc[item.Tool_Name].minPrice) {
                    acc[item.Tool_Name].minPrice = currentPrice;
                }
                
                // Plans එකතු කිරීම
                acc[item.Tool_Name].allPlans.push(item);
                
                return acc;
            }, {});

            // 5. Tiles Generate කරනවා
            for (const toolName in groupedData) {
                const tool = groupedData[toolName];
                const firstPlan = tool.firstPlan;
                
                // Details Page එකට යන Link එක හදනවා.
                const detailsLink = `details.html?tool=${encodeURIComponent(toolName)}&role=${isReseller ? 'reseller' : 'customer'}`;

                // ***************************************************************
                // 🔥 Home Page Reseller Content (සියලු Plans එකට Copy කිරීමට)
                // ***************************************************************
                let allPlansText = `⭐ ${toolName} Plans for Resale ⭐\n\n`;
                
                // සියලුම Plans වෙන වෙනම Text Block එකකට එකතු කිරීම
                tool.allPlans.forEach((plan, index) => {
                    // Home Page එකේදී අපි Reseller මිල ගමු
                    const price = plan.Reseller_Price_LKR; 
                    
                    allPlansText += `--- Plan ${index + 1} ---\n`;
                    allPlansText += `* ${plan.Plan_Tier} (${plan.Subscription_Type}) - ${plan.Duration_Months}\n`;
                    allPlansText += `💰 Resale Price: LKR ${parseFloat(price).toLocaleString('en-US')}\n`;
                    allPlansText += `🔑 Key Features: ${plan.Key_Features}\n`;
                    allPlansText += `\n`;
                });
                allPlansText += `[Add Your Contact Details Here]`;
                
                // --- String එක හරි විදියට සකස් කිරීම ---
                // 1. Text එකේ තියෙන සියලුම Single Quotes (අවුල් කරන Quotes) ඉවත් කරන්න.
                // 2. Text එකේ තියෙන New Line (\n) වෙනුවට Double Backslash (\n) ආදේශ කරන්න.
                const safeAllPlansText = allPlansText.replace(/'/g, '').replace(/\n/g, '\\n');

                const copyButtonHtml = isReseller ? `
                    <button class="copy-all-btn" 
                            onclick="event.stopPropagation(); event.preventDefault(); copyToClipboard('${safeAllPlansText}')">
                        <svg class="copy-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                    </button>
                ` : '';
                // ***************************************************************

                const tileHtml = `
                    <a href="${detailsLink}" class="product-tile">
                        <!-- 🔥 Copy Button එක මුලින්ම තැබීම -->
                        ${isReseller ? copyButtonHtml : ''}
                        
                        <img src="${firstPlan.Image_URL}" alt="${toolName} Logo">
                        <h3>${toolName}</h3>
                        <p class="summary-price">Starting from LKR ${tool.minPrice.toLocaleString()}</p>
                    </a>
                `;
                container.innerHTML += tileHtml;
            }
        })
        
		
		
		
		/* ... script.js file එකේ fetch block එකේ අවසානයට මේක එකතු කරන්න ... */

        
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            container.innerHTML = `<p style="color: red; text-align: center;">දත්ත ලබා ගැනීමේ දෝෂයක්. කරුණාකර පසුව උත්සාහ කරන්න.</p>`;
        })
        .finally(() => {
             // 🔥 Load වෙලා ඉවර වූ පසු Loader එක සඟවයි
             hideLoader();
        });

});


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

// ... [ඉතිරි copyToClipboard සහ showToast functions මෙතනින් පහළට තියෙන්න ඕනේ]

// ***************************************************************
// 💡 GLOBAL TOAST NOTIFICATION FUNCTION (Alert එක වෙනුවට)
// ***************************************************************
function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        
        // තත්පර 3 කින් පසු ස්වයංක්‍රීයව අතුරුදහන් වීමට
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}


// ***************************************************************
// Global Clipboard Function - දැන් Blocking Alert වෙනුවට Non-Blocking Toast භාවිතා කරයි
// ***************************************************************
function copyToClipboard(textToCopy) {
    // 1. New Line (\n) වෙනුවට Double Backslash (\n) ආදේශ කරන්න
    const finalContent = textToCopy.replace(/\\n/g, '\n'); 
    
    // 2. Temp Textarea එකක් හදලා Clipboard එකට දානවා
    const tempInput = document.createElement('textarea');
    tempInput.value = finalContent;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        // Fallback for execution within iFrame (Clipboard API එකේ ප්‍රශ්න නිසා)
        const successful = document.execCommand('copy');
        if (successful) {
             showToast('පිටපත් කිරීම සාර්ථකයි! (Successfully Copied)');
        } else {
             // If execCommand fails, try modern API 
             if (navigator.clipboard) {
                 navigator.clipboard.writeText(finalContent)
                    .then(() => showToast('පිටපත් කිරීම සාර්ථකයි! (Successfully Copied)'))
                    .catch(() => showToast('පිටපත් කිරීමේ දෝෂයක්. (Copying Failed)'));
             } else {
                showToast('පිටපත් කිරීමේ දෝෂයක්. (Copying Failed)');
             }
        }
    } catch (err) {
        showToast('පිටපත් කිරීමේ දෝෂයක්. (Copying Failed)');
    }
    
    // 3. Temp Textarea එක ඉවත් කිරීම
    document.body.removeChild(tempInput);
}

