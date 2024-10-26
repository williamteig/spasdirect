document.addEventListener('DOMContentLoaded', function () {
    (function () {
        // Collection points with latitudes and longitudes
        const collectionPoints = [
            { name: 'Archerfield, QLD', latitude: -27.5759, longitude: 153.0172 },
            { name: 'Rockdale, NSW', latitude: -33.9439, longitude: 151.1462 },
            { name: 'Reservoir, VIC', latitude: -37.7173, longitude: 145.0114 },
            { name: 'Forrestfield, WA', latitude: -31.9501, longitude: 116.0075 }
        ];

        // Elements needed for localization
        const priceElements = document.querySelectorAll('[data-localization="price"]');
        const localeElements = document.querySelectorAll('[data-localization="locale"]');
        const warningElements = document.querySelectorAll('[data-localization="warning"]');
        const buyNowButtons = document.querySelectorAll('[data-button="buy-now"]');
        const originalPrices = [];

        // Initialize prices and conceal them
        priceElements.forEach(priceElement => {
            const originalPrice = parseFloat(priceElement.textContent.trim()) || 0;
            originalPrices.push(originalPrice);
            priceElement.textContent = '____.__'; // Conceal the price initially
        });

        // Format a number with commas (e.g., 10,000.00)
        function formatWithCommas(number) {
            return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Update prices and control the display state of warnings
        function handlePriceDisplay(postcodeKnown, nearestDistance) {
            let pricesRevealed = false;

            priceElements.forEach((priceElement, index) => {
                let finalPrice = originalPrices[index];

                // Add $100 for every 100km away from the nearest collection point
                if (postcodeKnown && nearestDistance !== null) {
                    const distanceMultiplier = Math.floor(nearestDistance / 100);
                    finalPrice += distanceMultiplier * 100;
                    console.log(`Distance: ${nearestDistance.toFixed(2)} km`);
                }

                if (postcodeKnown) {
                    pricesRevealed = true; // Prices are revealed
                }

                priceElement.textContent = postcodeKnown ? formatWithCommas(finalPrice) : '____.__';
            });

            handleWarningDisplay(!pricesRevealed); // Show or hide warnings
            updateBuyNowButtons(); // Update the href of Buy Now buttons
        }

        // Show or hide warnings based on the price display state
        function handleWarningDisplay(showWarning) {
            warningElements.forEach(warning => {
                warning.style.display = showWarning ? 'block' : 'none';
            });
        }

        // Update all elements with data-localization="locale" to show the postcode
        function updateLocaleElements(postcode) {
            localeElements.forEach(localeElement => {
                localeElement.textContent = postcode;
            });
        }

        // Update the href of all Buy Now buttons and disable/enable them as needed
        function updateBuyNowButtons() {
            const price = document.querySelector('[data-localization="price"]')?.textContent.trim() || '0';
            const postcode = document.querySelector('[data-localization="locale"]')?.textContent.trim() || '';

            buyNowButtons.forEach(button => {
                const newHref = `https://spasdirect.foxycart.com/cart?name=spapool&price=${price}&zip=${postcode}`;
                button.setAttribute('href', newHref);

                // Disable the button if postcode is not set
                button.disabled = postcode === '' || price === '____.__';
            });
        }

        // Hide modal elements when necessary
        function hideModal() {
            const modalElements = document.querySelectorAll('[data-localization="modal"]');
            modalElements.forEach(modal => modal.style.display = 'none');
        }

        // Calculate the Haversine distance between two geographical points
        function haversineDistance(coords1, coords2) {
            const toRad = x => (x * Math.PI) / 180;
            const R = 6371; // Radius of Earth in kilometers
            const dLat = toRad(coords2.latitude - coords1.latitude);
            const dLon = toRad(coords2.longitude - coords1.longitude);
            const lat1 = toRad(coords1.latitude);
            const lat2 = toRad(coords2.latitude);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        // Calculate the nearest collection point and update the state
        function calculateDistanceToNearestCollection(postcodeData) {
            const { latitude, longitude, postcode } = postcodeData;
            let nearestDistance = Infinity;

            collectionPoints.forEach(point => {
                const distance = haversineDistance(
                    { latitude, longitude },
                    { latitude: point.latitude, longitude: point.longitude }
                );
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                }
            });

            localStorage.setItem('userPostcode', postcode);
            localStorage.setItem('nearestCollectionDistance', nearestDistance.toFixed(2));

            handlePriceDisplay(true, nearestDistance);
            hideModal();
            updateLocaleElements(postcode);
        }

        // Handle manual postcode submission and fetch details from API
        function handleManualPostcodeSubmission(postcode) {
            fetch(`https://spasdirect.vercel.app/api/validatePostcode?postcode=${postcode}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.localities?.locality) {
                        const locality = data.localities.locality[0];
                        calculateDistanceToNearestCollection({
                            postcode,
                            latitude: locality.latitude,
                            longitude: locality.longitude
                        });
                    } else {
                        console.error('Invalid postcode data received');
                        // Update UI to show error message
                    }
                })
                .catch(error => {
                    console.error('Error fetching postcode:', error);
                    // Update UI to show error message
                });
        }

        // Check if postcode is passed in the query parameters and handle it
        function checkForQueryPostcode() {
            const params = new URLSearchParams(window.location.search);
            const postcode = params.get('postcode');
            if (postcode && postcode.length === 4) {
                handleManualPostcodeSubmission(postcode);
            }
        }

        // Event listeners for form input and submission
        const submitButton = document.querySelector('[data-localization="post-code-submit"]');
        const postcodeInput = document.querySelector('[data-localization="post-code-input"]');

        postcodeInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitButton.click();
            }
        });

        postcodeInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
        });

        submitButton.addEventListener('click', function () {
            const postcode = postcodeInput.value.trim();
            if (postcode.length === 4) {
                handleManualPostcodeSubmission(postcode);
            }
        });

        // Load cached postcode and distance if available, otherwise use geolocation
        const cachedPostcode = localStorage.getItem('userPostcode');
        const cachedDistance = parseFloat(localStorage.getItem('nearestCollectionDistance')) || null;

        if (cachedPostcode && cachedDistance !== null) {
            handlePriceDisplay(true, cachedDistance);
            hideModal();
            updateLocaleElements(cachedPostcode);
        } else if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const { latitude, longitude } = position.coords;
                    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.postcode) {
                                calculateDistanceToNearestCollection({
                                    postcode: data.postcode,
                                    latitude,
                                    longitude
                                });
                            }
                        });
                },
                function (error) {
                    console.error('Geolocation error:', error);
                }
            );
        }

        // Check for query parameter on page load
        checkForQueryPostcode();
    })();
});
