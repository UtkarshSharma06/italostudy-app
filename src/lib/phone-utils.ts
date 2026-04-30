export const getDigits = (value: string): string => {
    return value.replace(/\D/g, '');
};

export const formatPhoneNumber = (value: string, countryCode: string): string => {
    const digits = getDigits(value);
    
    // US: (XXX) XXX-XXXX
    if (countryCode === 'US') {
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    // TR, IT: XXX XXX XXXX (standard spaced format)
    if (countryCode === 'TR' || countryCode === 'IT') {
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }

    // IN: XXXXX XXXXX
    if (countryCode === 'IN') {
        if (digits.length <= 5) return digits;
        return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
    }

    // Default: Spaces every 3-4 digits for readability
    if (digits.length === 10) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
    if (digits.length === 11) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
    }

    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
        if (i > 0 && i % 3 === 0 && digits.length > i + 1) {
            formatted += ' ';
        }
        formatted += digits[i];
    }
    return formatted;
};
