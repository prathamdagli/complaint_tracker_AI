import React, { useEffect, useId, useState } from 'react';

/**
 * Mobile-number input with a country-code dropdown.
 * - Country dial code defaults to +91 (India).
 * - Number box only accepts digits, hard-capped at 10.
 * - Inline error appears when the user has typed something but it's not 10 digits.
 * - Emits the full canonical string "<code> <digits>" (e.g. "+91 9876543210")
 *   via onChange — empty string when completely blank.
 * - Emits onValidity(true|false) so the parent can gate form submission.
 */

const COUNTRIES = [
    { code: '+91', name: 'India' },
    { code: '+1', name: 'USA / Canada' },
    { code: '+44', name: 'United Kingdom' },
    { code: '+971', name: 'UAE' },
    { code: '+61', name: 'Australia' },
    { code: '+65', name: 'Singapore' },
    { code: '+49', name: 'Germany' },
    { code: '+33', name: 'France' },
    { code: '+81', name: 'Japan' },
    { code: '+86', name: 'China' },
    { code: '+92', name: 'Pakistan' },
    { code: '+880', name: 'Bangladesh' },
    { code: '+94', name: 'Sri Lanka' },
    { code: '+977', name: 'Nepal' },
    { code: '+966', name: 'Saudi Arabia' },
    { code: '+852', name: 'Hong Kong' },
    { code: '+64', name: 'New Zealand' },
    { code: '+27', name: 'South Africa' },
];

const DEFAULT_COUNTRY = '+91';

/** Parse an existing stored mobile number (which may or may not have a code prefix). */
const parseMobile = (full) => {
    if (!full) return { code: DEFAULT_COUNTRY, digits: '' };
    const trimmed = String(full).trim();
    // Prefer "+cc digits" style
    const withSpace = trimmed.match(/^(\+\d{1,4})\s*(\d+)$/);
    if (withSpace) {
        const code = withSpace[1];
        const digits = withSpace[2].slice(-10);
        const knownCode = COUNTRIES.find(c => c.code === code)?.code || DEFAULT_COUNTRY;
        return { code: knownCode, digits };
    }
    // Fallback: last 10 digits, default to +91
    const digitsOnly = trimmed.replace(/\D/g, '');
    return { code: DEFAULT_COUNTRY, digits: digitsOnly.slice(-10) };
};

const MobileInput = ({
    value,
    onChange,
    onValidity,
    required = false,
    showErrorOnBlurOnly = true,
    className = '',
    placeholder = 'Enter 10-digit number'
}) => {
    const parsed = parseMobile(value);
    const [countryCode, setCountryCode] = useState(parsed.code);
    const [digits, setDigits] = useState(parsed.digits);
    const [touched, setTouched] = useState(false);
    const uid = useId();

    // Keep internal state in sync when the parent injects a new value (e.g. profile prefill)
    useEffect(() => {
        const p = parseMobile(value);
        setCountryCode(p.code);
        setDigits(p.digits);
    }, [value]);

    const emit = (code, d) => {
        const full = d ? `${code} ${d}` : '';
        onChange?.(full);
        onValidity?.(d.length === 10);
    };

    const handleCountry = (e) => {
        const next = e.target.value;
        setCountryCode(next);
        emit(next, digits);
    };

    const handleDigits = (e) => {
        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
        setDigits(clean);
        emit(countryCode, clean);
    };

    const isValid = digits.length === 10;
    const isEmpty = digits.length === 0;
    const hasTypedSomething = digits.length > 0;
    // Show the "must be 10" error when the user has typed a partial number.
    // Also show if required-and-empty AFTER they've interacted with the input.
    const showError =
        (hasTypedSomething && !isValid && (!showErrorOnBlurOnly || touched)) ||
        (required && isEmpty && touched);

    return (
        <div className={className}>
            <div className="flex gap-2">
                <select
                    value={countryCode}
                    onChange={handleCountry}
                    onBlur={() => setTouched(true)}
                    aria-label="Country dialing code"
                    className="bg-surface-container-low border-none rounded-2xl px-3 py-4 font-bold text-on-surface focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer min-w-[110px]"
                >
                    {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                            {c.code} · {c.name}
                        </option>
                    ))}
                </select>
                <input
                    id={`mobile-${uid}`}
                    type="tel"
                    inputMode="numeric"
                    pattern="\d{10}"
                    maxLength={10}
                    value={digits}
                    onChange={handleDigits}
                    onBlur={() => setTouched(true)}
                    placeholder={placeholder}
                    aria-invalid={showError}
                    required={required}
                    className="flex-1 bg-surface-container-low border-none rounded-2xl p-4 font-body text-on-surface focus:ring-2 focus:ring-primary/20 placeholder:text-outline font-bold outline-none"
                />
            </div>
            {showError && (
                <p className="text-error text-xs font-bold mt-2" role="alert">
                    {isEmpty
                        ? 'Mobile number is required.'
                        : `Mobile number must be exactly 10 digits — you entered ${digits.length}.`}
                </p>
            )}
        </div>
    );
};

export default MobileInput;
