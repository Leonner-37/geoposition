// Инициализация карты
let map;
let currentMarker = null;
let currentCircle = null;
let watchId = null;
let isTracking = false;

// Центр карты по умолчанию (Москва)
const defaultCenter = [55.751244, 37.618423];

// Инициализация карты
function initMap() {
    map = L.map('map').setView(defaultCenter, 10);

    // Добавляем тайлы OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 3
    }).addTo(map);
}

// Обновление информации на панели
function updateInfoPanel(latitude, longitude, accuracy, timestamp = null) {
    document.getElementById('lat').textContent = latitude.toFixed(6);
    document.getElementById('lng').textContent = longitude.toFixed(6);

    if (accuracy) {
        if (accuracy < 100) {
            document.getElementById('accuracy').textContent = `${Math.round(accuracy)} метров`;
            document.getElementById('accuracyUnit').textContent = '🎯';
        } else {
            document.getElementById('accuracy').textContent = `${Math.round(accuracy)} метров`;
            document.getElementById('accuracyUnit').textContent = '⚠️';
        }
    }

    if (timestamp) {
        const date = new Date(timestamp);
        document.getElementById('additionalInfo').innerHTML = `
                    ⏱️ Обновлено: ${date.toLocaleTimeString()}
                `;
    }
}

// Обновление статуса
function updateStatus(message, isError = false) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    if (isError) {
        statusDiv.style.background = 'rgba(244, 67, 54, 0.9)';
        setTimeout(() => {
            if (statusDiv.textContent === message) {
                statusDiv.style.background = 'rgba(0, 0, 0, 0.7)';
            }
        }, 3000);
    } else {
        statusDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    }
}

// Добавление маркера на карту
function addMarker(latitude, longitude, accuracy) {
    // Удаляем старые маркеры и круги
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    if (currentCircle) {
        map.removeLayer(currentCircle);
    }

    // Создаем кастомную иконку для маркера
    const customIcon = L.divIcon({
        html: `<div style="
                    width: 24px;
                    height: 24px;
                    background-color: #4CAF50;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    animation: pulse 1.5s infinite;
                "></div>`,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // Добавляем маркер
    currentMarker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

    // Добавляем круг точности если больше 10 метров
    if (accuracy && accuracy > 10) {
        currentCircle = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
    }

    // Добавляем всплывающее окно
    currentMarker.bindPopup(`
                <b>📍 Ваше местоположение</b><br>
                Широта: ${latitude.toFixed(6)}<br>
                Долгота: ${longitude.toFixed(6)}<br>
                Точность: ${accuracy ? Math.round(accuracy) + ' м' : 'неизвестно'}
            `).openPopup();

    // Центрируем карту на позиции
    map.setView([latitude, longitude], Math.max(15, Math.min(18, 18 - Math.log10(accuracy || 100))));
}

// Обработка успешного получения позиции
function handleSuccess(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    const timestamp = position.timestamp;

    updateInfoPanel(latitude, longitude, accuracy, timestamp);
    addMarker(latitude, longitude, accuracy);
    updateStatus(`✅ Позиция получена (точность: ${Math.round(accuracy)} м)`);
    document.getElementById('statusText').textContent = 'Получено';
}

// Обработка ошибок геолокации
function handleError(error) {
    let message = '';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = '❌ Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
            document.getElementById('statusText').textContent = 'Доступ запрещен';
            break;
        case error.POSITION_UNAVAILABLE:
            message = '❌ Информация о местоположении недоступна.';
            document.getElementById('statusText').textContent = 'Недоступно';
            break;
        case error.TIMEOUT:
            message = '⏱️ Время запроса истекло. Попробуйте еще раз.';
            document.getElementById('statusText').textContent = 'Таймаут';
            break;
        default:
            message = '❌ Произошла неизвестная ошибка.';
            document.getElementById('statusText').textContent = 'Ошибка';
    }
    updateStatus(message, true);
    console.error('Geolocation error:', error);
}

// Получение позиции один раз
function getCurrentLocation() {
    if (!navigator.geolocation) {
        updateStatus('❌ Ваш браузер не поддерживает геолокацию', true);
        document.getElementById('statusText').textContent = 'Не поддерживается';
        return;
    }

    updateStatus('⏳ Получение геопозиции...');
    document.getElementById('statusText').textContent = 'Запрос...';

    navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Начать/остановить отслеживание
function toggleTracking() {
    if (!navigator.geolocation) {
        updateStatus('❌ Ваш браузер не поддерживает геолокацию', true);
        return;
    }

    if (isTracking) {
        // Останавливаем отслеживание
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        isTracking = false;
        const trackBtn = document.getElementById('trackLocationBtn');
        trackBtn.textContent = '🔄 Отслеживать';
        trackBtn.classList.remove('active');
        updateStatus('⏸️ Отслеживание остановлено');
        document.getElementById('statusText').textContent = 'Отслеживание остановлено';
    } else {
        // Начинаем отслеживание
        updateStatus('⏳ Начинаем отслеживание...');
        document.getElementById('statusText').textContent = 'Отслеживание...';

        watchId = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
        isTracking = true;
        const trackBtn = document.getElementById('trackLocationBtn');
        trackBtn.textContent = '⏹️ Остановить';
        trackBtn.classList.add('active');
        updateStatus('🟢 Отслеживание активно');
    }
}

// Проверка поддержки геолокации при загрузке
function checkGeolocationSupport() {
    if (!navigator.geolocation) {
        updateStatus('❌ Геолокация не поддерживается вашим браузером', true);
        document.getElementById('getLocationBtn').disabled = true;
        document.getElementById('trackLocationBtn').disabled = true;
        document.getElementById('getLocationBtn').classList.add('loading');
        document.getElementById('trackLocationBtn').classList.add('loading');
        document.getElementById('statusText').textContent = 'Не поддерживается';
    }
}

// Добавляем анимацию пульсации
const style = document.createElement('style');
style.textContent = `
            @keyframes pulse {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                100% {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
document.head.appendChild(style);

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    checkGeolocationSupport();

    // Добавляем обработчики кнопок
    document.getElementById('getLocationBtn').addEventListener('click', getCurrentLocation);
    document.getElementById('trackLocationBtn').addEventListener('click', toggleTracking);
});

// Очищаем watch при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
});

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW зарегистрирован: ', registration.scope);
            })
            .catch((err) => {
                console.log('Ошибка регистрации SW: ', err);
            });
    });
}