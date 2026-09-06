export const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

export const formatINR = (value) => {
    return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
};

export const formatValueInteger = (value) => {
    // Remove all non-digit characters
    const cleaned = String(value).replace(/[^0-9]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
};

export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const debounce = (fn, delay) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
};