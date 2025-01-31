// Utility functions
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Phone number validation config
const COUNTRY_CONFIGS = {
    'KE': {
        code: '+254',
        minLength: 9,
        maxLength: 9,
        pattern: /^[17]\d{8}$/
    },
    'UG': {
        code: '+256',
        minLength: 9,
        maxLength: 9,
        pattern: /^[7]\d{8}$/
    },
    'TZ': {
        code: '+255',
        minLength: 9,
        maxLength: 9,
        pattern: /^[67]\d{8}$/
    },
    'US': {
        code: '+1',
        minLength: 10,
        maxLength: 10,
        pattern: /^\d{10}$/
    },
    'GB': {
        code: '+44',
        minLength: 10,
        maxLength: 10,
        pattern: /^[1-9]\d{9}$/
    }
};

function formatPhoneNumber(phone, countryCode) {
    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');
    
    const config = COUNTRY_CONFIGS[countryCode];
    if (!config) return null;
    
    // Remove country code if present
    if (phone.startsWith(config.code.slice(1))) {
        phone = phone.slice(config.code.length - 1);
    }
    
    // Remove leading zero if present
    if (phone.startsWith('0')) {
        phone = phone.slice(1);
    }
    
    return phone;
}

function validatePhone(phone, countryCode) {
    const config = COUNTRY_CONFIGS[countryCode];
    if (!config) {
        return {
            isValid: false,
            error: 'Unsupported country code',
            formattedNumber: null
        };
    }
    
    const formattedPhone = formatPhoneNumber(phone, countryCode);
    
    if (!formattedPhone) {
        return {
            isValid: false,
            error: 'Invalid phone number format',
            formattedNumber: null
        };
    }
    
    if (!config.pattern.test(formattedPhone)) {
        return {
            isValid: false,
            error: `Invalid phone number for ${countryCode}`,
            formattedNumber: null
        };
    }
    
    return {
        isValid: true,
        error: null,
        formattedNumber: `${config.code}${formattedPhone}`
    };
}

// Success overlay HTML
const successOverlayHTML = `
    <div id="successOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
            <div id="successEmoji" class="text-6xl mb-4">✨💘</div>
            <h2 class="text-2xl font-bold mb-4">Message Scheduled!</h2>
            <p id="successMessage" class="text-lg mb-6"></p>
            <button onclick="closeSuccessOverlay()" class="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition-colors">
                Close
            </button>
        </div>
    </div>
`;

// Success overlay functions
function showSuccessOverlay(recipientName, messageType) {
    const overlay = document.getElementById('successOverlay');
    const messageElement = document.getElementById('successMessage');
    const emojiElement = document.getElementById('successEmoji');

    let message, emoji;
    if (messageType === 'custom') {
        message = `Your heartfelt message to ${recipientName} has been scheduled! We'll make sure your personal words of love reach them at just the right moment 💌`;
        emoji = '👉💝✨😉';
    } else {
        message = `Get ready to make ${recipientName}'s day special! We've crafted a beautiful message based on your feelings and will deliver it with love! 🌹`;
        emoji = '👉✨💘😉';
    }

    emojiElement.textContent = emoji;
    messageElement.textContent = message;
    overlay.classList.remove('hidden');
}

function closeSuccessOverlay() {
    const overlay = document.getElementById('successOverlay');
    overlay.classList.add('hidden');
}

// Add overlay to document
document.addEventListener('DOMContentLoaded', function() {
    document.body.insertAdjacentHTML('beforeend', successOverlayHTML);
});

// Main form handling
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('messageForm');
    const phoneInput = form.querySelector('input[name="phone_number"]');
    const emailInput = form.querySelector('input[name="email"]');
    const countrySelect = form.querySelector('select[name="phone_country"]');
    const phoneError = document.getElementById('phoneError');
    const statusDiv = document.getElementById('status');
    const descriptionContainer = document.getElementById('descriptionContainer');
    const customMessageContainer = document.getElementById('customMessageContainer');
    const descriptionTextarea = document.querySelector('textarea[name="description"]');
    const customMessageTextarea = document.querySelector('textarea[name="custom_message"]');

    // Make email optional
    emailInput.required = false;
    emailInput.placeholder = "Email (Optional)";

    // Handle message type toggle
    const messageTypeRadios = document.querySelectorAll('input[name="message_type"]');
    messageTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customMessageContainer.classList.remove('hidden');
                descriptionContainer.classList.add('hidden');
                customMessageTextarea.required = true;
                descriptionTextarea.required = false;
            } else {
                customMessageContainer.classList.add('hidden');
                descriptionContainer.classList.remove('hidden');
                customMessageTextarea.required = false;
                descriptionTextarea.required = true;
            }
        });
    });

    // Update placeholder based on selected country
    countrySelect.addEventListener('change', function(e) {
        const config = COUNTRY_CONFIGS[e.target.value];
        if (config) {
            phoneInput.placeholder = `Example: 7XXXXXXXX (${config.code})`;
        }
    });

    // Phone input validation
    phoneInput.addEventListener('input', function(e) {
        const result = validatePhone(e.target.value, countrySelect.value);
        phoneError.textContent = result.error || '';
        phoneError.classList.toggle('hidden', result.isValid);
        e.target.setCustomValidity(result.isValid ? '' : result.error);
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const phoneResult = validatePhone(
            formData.get('phone_number'),
            formData.get('phone_country')
        );
        
        if (!phoneResult.isValid) {
            phoneError.textContent = phoneResult.error;
            phoneError.classList.remove('hidden');
            return;
        }

        try {
            // Check for existing message if the function exists
            if (typeof checkExistingMessage === 'function') {
                const hasExistingMessage = await checkExistingMessage(phoneResult.formattedNumber);
                if (hasExistingMessage) {
                    statusDiv.textContent = 'A message is already scheduled for this number';
                    statusDiv.classList.remove('hidden');
                    statusDiv.className = 'mt-4 text-center text-red-600';
                    return;
                }
            }

            const messageType = formData.get('message_type');
            const data = {
                sender_name: formData.get('sender_name'),
                recipient_name: formData.get('recipient_name'),
                email: formData.get('email') || null,
                phone_number: phoneResult.formattedNumber,
                phone_country: formData.get('phone_country'),
                relationship: formData.get('relationship'),
                custom_message: messageType === 'custom' ? formData.get('custom_message') : null,  // Send custom_message when type is 'custom'
                description: messageType !== 'custom' ? formData.get('description') : null,  // Send description when type is NOT 'custom'
                message_type: messageType
            };

            console.log('Sending data:', data);

            const response = await fetch('https://soltechs.pythonanywhere.com/api/messages/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                showSuccessOverlay(formData.get('recipient_name'), messageType);
                form.reset();
                // Reset to generated message view after successful submission
                descriptionContainer.classList.remove('hidden');
                customMessageContainer.classList.add('hidden');
            } else {
                const result = await response.json();
                throw new Error(result.message || 'Failed to schedule message');
            }
        } catch (error) {
            console.error('Error details:', error);
            statusDiv.textContent = error.message;
            statusDiv.classList.remove('hidden');
            statusDiv.className = 'mt-4 text-center text-red-600';
        }
    });
});

// Premium services section handling
const premiumForm = document.getElementById('premiumForm');
premiumForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const premiumRequest = document.getElementById('premiumRequest').value;
    const premiumContact = document.getElementById('premiumContact').value;

    if (!premiumContact) {
        alert('Please provide your contact number');
        return;
    }

    try {
        const response = await fetch('https://soltechs.pythonanywhere.com/api/premium-requests/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            credentials: 'include',
            body: JSON.stringify({
                request_description: premiumRequest,
                contact_number: premiumContact
            })
        });

        if (response.ok) {
            showPremiumPopup();
            premiumForm.reset();
            const premiumSection = document.getElementById('premiumSection');
            if (premiumSection) {
                premiumSection.classList.remove('expanded');
            }
        } else {
            const result = await response.json();
            throw new Error(result.message || 'Failed to submit premium request');
        }
    } catch (error) {
        console.error('Error submitting premium request:', error);
        alert('Failed to submit request. Please try again later.');
    }
});

function showPremiumPopup() {
    // Inject CSS dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .premium-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .premium-popup {
            background: #fff;
            padding: 20px;
            max-width: 400px;
            text-align: center;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            position: relative;
            animation: fadeIn 0.3s ease-in-out;
        }

        .premium-popup h2 {
            color: #e91e63;
            font-size: 22px;
        }

        .premium-popup ul {
            list-style: none;
            padding: 0;
            text-align: left;
        }

        .premium-popup ul li {
            padding: 5px 0;
            font-size: 16px;
        }

        .close-btn {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            cursor: pointer;
            color: #555;
        }

        .close-btn:hover {
            color: red;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(style);

    // Create Popup
    const popup = document.createElement('div');
    popup.innerHTML = `
        <div class="premium-popup-overlay">
            <div class="premium-popup">
                <span class="close-btn">&times;</span>
                <h2>Make Her Day Extra Special! 💖</h2>
                <p>Premium services are available at a fee to create an extraordinary Valentine's experience!</p>
                <h3>What We Can Do:</h3>
                <ul>
                    <li>💐 Surprise flower & gift deliveries</li>
                    <li>🎶 Personalized romantic song dedication</li>
                    <li>📸 A customized video message</li>
                    <li>🍽️ Candlelight dinner reservations</li>
                    <li>💌 Handwritten love letters</li>
                </ul>
                <p>We'll contact you soon to arrange the perfect surprise! ❤️</p>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Close popup functionality
    popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());
    popup.querySelector('.premium-popup-overlay').addEventListener('click', (e) => {
        if (e.target === popup.querySelector('.premium-popup-overlay')) {
            popup.remove();
        }
    });
}
