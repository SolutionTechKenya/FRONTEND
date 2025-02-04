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
    'KE': { code: '+254', minLength: 9, maxLength: 9, pattern: /^[17]\d{8}$/ },
    'UG': { code: '+256', minLength: 9, maxLength: 9, pattern: /^[7]\d{8}$/ },
    'TZ': { code: '+255', minLength: 9, maxLength: 9, pattern: /^[67]\d{8}$/ },
    'US': { code: '+1', minLength: 10, maxLength: 10, pattern: /^\d{10}$/ },
    'GB': { code: '+44', minLength: 10, maxLength: 10, pattern: /^[1-9]\d{9}$/ }
};

function formatPhoneNumber(phone, countryCode) {
    phone = phone.replace(/\D/g, '');
    const config = COUNTRY_CONFIGS[countryCode];
    if (!config) return null;
    if (phone.startsWith(config.code.slice(1))) phone = phone.slice(config.code.length - 1);
    if (phone.startsWith('0')) phone = phone.slice(1);
    return phone;
}

function validatePhone(phone, countryCode) {
    const config = COUNTRY_CONFIGS[countryCode];
    if (!config) return { isValid: false, error: 'Unsupported country code' };
    
    const formattedPhone = formatPhoneNumber(phone, countryCode);
    if (!formattedPhone) return { isValid: false, error: 'Invalid phone number format' };
    if (!config.pattern.test(formattedPhone)) return { isValid: false, error: `Invalid phone number for ${countryCode}` };

    return {
        isValid: true,
        error: null,
        formattedNumber: `${config.code}${formattedPhone}`
    };
}

// Success overlay management
const successOverlayHTML = `
    <div id="successOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
            <div id="successEmoji" class="text-6xl mb-4">✨💘</div>
            <h2 class="text-2xl font-bold mb-4">Message Scheduled!</h2>
            <p id="successMessage" class="text-lg mb-6"></p>
            <button onclick="closeSuccessOverlay()" 
                    class="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition-colors">
                Close
            </button>
        </div>
    </div>
`;

function showSuccessOverlay(recipientName, messageType) {
    const overlay = document.getElementById('successOverlay');
    const messageElement = document.getElementById('successMessage');
    const emojiElement = document.getElementById('successEmoji');
    
    const [message, emoji] = messageType === 'custom' ? 
        [`Your heartfelt message to ${recipientName} has been scheduled! 💌`, '👉💝✨😉'] :
        [`Get ready to make ${recipientName}'s day special! 🌹`, '👉✨💘😉'];

    emojiElement.textContent = emoji;
    messageElement.textContent = message;
    overlay.classList.remove('hidden');
}

function closeSuccessOverlay() {
    document.getElementById('successOverlay').classList.add('hidden');
}

// Main form handling
document.addEventListener('DOMContentLoaded', function() {
    // Inject success overlay
    document.body.insertAdjacentHTML('beforeend', successOverlayHTML);

    // Form elements
    const form = document.getElementById('messageForm');
    const phoneInput = form.querySelector('[name="phone_number"]');
    const countrySelect = form.querySelector('[name="phone_country"]');
    const phoneError = document.getElementById('phoneError');
    const statusDiv = document.getElementById('status');
    const messageTypeRadios = document.querySelectorAll('[name="message_type"]');
    const descContainer = document.getElementById('descriptionContainer');
    const customContainer = document.getElementById('customMessageContainer');
    const descField = document.querySelector('[name="description"]');
    const customField = document.querySelector('[name="custom_message"]');

    // Message type toggle handler
    messageTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isCustom = e.target.value === 'custom';
            descContainer.classList.toggle('hidden', isCustom);
            customContainer.classList.toggle('hidden', !isCustom);
            descField.required = !isCustom;
            customField.required = isCustom;
        });
    });

    // Phone number formatting
    countrySelect.addEventListener('change', (e) => {
        const config = COUNTRY_CONFIGS[e.target.value];
        if (config) phoneInput.placeholder = `Example: ${config.code}`;
    });

    // Real-time phone validation
    phoneInput.addEventListener('input', (e) => {
        const result = validatePhone(e.target.value, countrySelect.value);
        phoneError.textContent = result.error || '';
        phoneError.classList.toggle('hidden', result.isValid);
        e.target.setCustomValidity(result.error || '');
    });

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Validate phone number
            const phoneResult = validatePhone(phoneInput.value, countrySelect.value);
            if (!phoneResult.isValid) {
                phoneError.textContent = phoneResult.error;
                phoneError.classList.remove('hidden');
                return;
            }

            // Get form values directly from elements
            const messageType = document.querySelector('[name="message_type"]:checked').value;
            const messageContent = messageType === 'custom' ? 
                customField.value.trim() : descField.value.trim();

            // Validate message content
            if (!messageContent) {
                statusDiv.textContent = messageType === 'custom' ? 
                    'Please write your custom message' : 'Please describe your feelings';
                statusDiv.className = 'mt-4 text-center text-red-600';
                statusDiv.classList.remove('hidden');
                return;
            }

            // Prepare submission data
            const data = {
                sender_name: form.querySelector('[name="sender_name"]').value,
                recipient_name: form.querySelector('[name="recipient_name"]').value,
                phone_country: countrySelect.value,
                phone_number: phoneResult.formattedNumber,
                email: form.querySelector('[name="email"]').value || null,
                relationship: form.querySelector('[name="relationship"]').value,
                message_type: messageType,
                [messageType === 'custom' ? 'custom_message' : 'description']: messageContent
            };

            // Submit to backend
            const response = await fetch('https://soltechssolutions.com/api/messages/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            // Handle response
            if (response.ok) {
                showSuccessOverlay(data.recipient_name, messageType);
                form.reset();
                descContainer.classList.remove('hidden');
                customContainer.classList.add('hidden');
                statusDiv.classList.add('hidden');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to schedule message');
            }
        } catch (error) {
            console.error('Submission error:', error);
            statusDiv.textContent = error.message;
            statusDiv.className = 'mt-4 text-center text-red-600';
            statusDiv.classList.remove('hidden');
        }
    });
});

// Premium services handling
document.getElementById('premiumForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const request = document.getElementById('premiumRequest').value.trim();
    const contact = document.getElementById('premiumContact').value.trim();

    if (!contact) {
        alert('Please provide your contact number');
        return;
    }

    try {
        const response = await fetch('https://soltechssolutions.com/api/premium/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                request_description: request,
                contact_number: contact
            })
        });

        if (!response.ok) throw new Error('Request failed');
        
        showPremiumPopup();
        e.target.reset();
    } catch (error) {
        console.error('Premium request error:', error);
        alert('Failed to submit request. Please try again.');
    }
});

// Floating hearts animation (keep existing implementation)
function createFloatingHeart() { /* ... */ }
setInterval(createFloatingHeart, 3000);
