document.addEventListener('DOMContentLoaded', () => {
    // 🔥 1. Variables මුලින්ම Define කිරීම
    // ඔබේ Apps Script URL එක මෙතනට දාන්න
    const DATA_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLiGHBET9ryIfTdodN3PvaSCnhCvpli-XjkrCYZCyaOaUxdeCM1sRyyUNm1mBYsAqTXZhme7D0WLNfWPPSx88UDQEc2GICBKZPSvlE6mkThmCM1tj2VT74jShTfOrvEpR_ZnkBqzeIRm3TyU3rPwhcFlRTaV7DYccbla4GMlKvANFCqpMEN7VffS5HgKGdnhmt97ea5MSovr3q_83wcyLvmbGW19_MD_FzxQk5IvD2idvmZ-Tpl2G7bXd9ExkVu23qxXQzgA5jhY-xkbFtUR9Cbj1St9nlO3bMuyYMrU&lib=MqHVIVDbe7GGrYzAr3eXPOg6Ct9MHB8JG'; 
    const CACHE_KEY = 'digitalPriceCache';
    const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

    const container = document.getElementById('products-container');
    const title = document.getElementById('page-title');

    const urlParams = new URLSearchParams(window.location.search);
    const isReseller = urlParams.get('role') === 'reseller';

    if (isReseller) {
        title.textContent = 'Reseller Price List (Private)';
    }

    // දත්ත පෙන්වීම සහ Caching Logic එක ක්‍රියාත්මක කිරීම
    function processAndRenderData(data, isCached) {
        const groupedData = data.reduce((acc, item) => {
            // ... (Grouping Logic එක)
            const currentPrice = isReseller ? item.Reseller_Price_LKR : item.Customer_Price_LKR;
            
            if (!acc[item.Tool_Name] || currentPrice < acc[item.Tool_Name].minPrice) {
                acc[item.Tool_Name] = {
                    minPrice: currentPrice,
                    firstPlan: item,
                    plans: [] // සියලුම plans මෙහි තබාගන්නවා
                };
            }
            // සියලුම plans අදාල Tool එකට එකතු කරනවා
            acc[item.Tool_Name].plans.push(item);
            return acc;
        }, {});

        container.innerHTML = ''; // පැරණි content අයින් කරන්න

        for (const toolName in groupedData) {
            const tool = groupedData[toolName];
            const firstPlan = tool.firstPlan;

            // ... (Copy Text එක හදන Logic එක)
            const allPlansText = tool.plans.map(plan => {
                const price = isReseller ? plan.Reseller_Price_LKR : plan.Customer_Price_LKR;
                const priceLabel = isReseller ? 'Reseller Price' : 'Price';

                return `✅ ${plan.Plan_Tier} (${plan.Subscription_Type}) - ${plan.Duration_Months}\n` +
                       `   LKR ${price.toLocaleString()} (${priceLabel})\n` +
                       `   Features: ${plan.Key_Features}`;
            }).join('\n\n');

            const safeAllPlansText = allPlansText.replace(/'/g, "\\'");
            
            // ... (Tile HTML Generate කරන Logic එක)
            const copyButtonHtml = isReseller ? `
                <button class="copy-all-btn" 
                        onclick="event.stopPropagation(); event.preventDefault(); copyToClipboard('${safeAllPlansText}')">
                    <svg class="copy-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-2m-8-4l-4 4-4-4m4 4V5" />
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

        // Cached දත්ත පෙන්වනවා නම්, Loader එක hide කරන්න
        if (isCached) {
             hideLoader();
             // පසුව පසුබිමින් අලුත් දත්ත Fetch කරන්න
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
            // අලුත් දත්ත Cache කරන්න
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

            // අලුත් දත්ත වලින් Page එක නැවත Render කරන්න (Silent update)
            processAndRenderData(data, false);
        })
        .catch(error => {
            console.error('Error fetching latest data:', error);
        })
        .finally(() => {
            // අලුත් දත්ත Load කිරීම අවසන් වූ පසු Loader එක අයින් කරන්න
            // (Cache එකෙන් Load කළේ නැත්නම්, මේක මුලින්ම call වේවි)
            if (!localStorage.getItem(CACHE_KEY)) {
                hideLoader();
            }
        });
    }

    // මුලින්ම Cache එකෙන් දත්ත Load කිරීම
    const cachedItem = localStorage.getItem(CACHE_KEY);
    
    if (cachedItem) {
        const { data, timestamp } = JSON.parse(cachedItem);
        const expiryTime = CACHE_EXPIRY;

        if (Date.now() < timestamp + expiryTime) {
            // Cache එක වලංගු නම්, ක්ෂණිකව Load කරලා, පසුබිමින් Update කරන්න
            processAndRenderData(data, true); 
        } else {
            // Cache එක කල් ඉකුත් වෙලා නම්, Loader එක තියලා අලුතින් Load කරන්න
            fetchLatestData();
        }
    } else {
        // Cache එකක් නැත්නම්, Loader එක තියලා අලුතින් Load කරන්න
        fetchLatestData();
    }
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

