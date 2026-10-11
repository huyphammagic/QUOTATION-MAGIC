/**
 * Utility to convert numbers into Words in Vietnamese and English for invoices & debit notes.
 */

const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroupOfThreeVi(group: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(group / 100);
  const remainder = group % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;

  let result = '';

  if (hundreds > 0 || showZeroHundred) {
    result += `${VI_DIGITS[hundreds]} trăm `;
  }

  if (tens > 1) {
    result += `${VI_DIGITS[tens]} mươi `;
    if (units === 1) {
      result += 'mốt ';
    } else if (units === 5) {
      result += 'lăm ';
    } else if (units > 0) {
      result += `${VI_DIGITS[units]} `;
    }
  } else if (tens === 1) {
    result += 'mười ';
    if (units === 5) {
      result += 'lăm ';
    } else if (units > 0) {
      result += `${VI_DIGITS[units]} `;
    }
  } else {
    // tens === 0
    if (showZeroHundred && units > 0) {
      result += `linh ${VI_DIGITS[units]} `;
    } else if (units > 0) {
      result += `${VI_DIGITS[units]} `;
    }
  }

  return result.trim();
}

/**
 * Converts VND integer amount to Vietnamese words
 * e.g. 15800000 -> "Mười lăm triệu tám trăm nghìn đồng chẵn"
 */
export function numberToVietnameseWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Không đồng chẵn';
  const rounded = Math.round(Math.abs(amount));

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];

  let temp = rounded;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const showZero = i < groups.length - 1;
      const groupText = readGroupOfThreeVi(groupVal, showZero);
      const scaleText = scales[i];
      words += `${groupText} ${scaleText} `.trim() + ' ';
    }
  }

  words = words.trim();
  if (!words) return 'Không đồng chẵn';

  // Capitalize first letter and append "đồng chẵn"
  const formatted = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng chẵn.';
  return formatted.replace(/\s+/g, ' ');
}

// English words mapping
const EN_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const EN_SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertThreeDigitEn(num: number): string {
  let res = '';
  const h = Math.floor(num / 100);
  const t = num % 100;

  if (h > 0) {
    res += `${EN_ONES[h]} Hundred`;
    if (t > 0) res += ' and ';
  }

  if (t > 0) {
    if (t < 20) {
      res += EN_ONES[t];
    } else {
      const tensDigit = Math.floor(t / 10);
      const unitDigit = t % 10;
      res += EN_TENS[tensDigit];
      if (unitDigit > 0) res += `-${EN_ONES[unitDigit]}`;
    }
  }

  return res.trim();
}

/**
 * Converts USD amount into English Words
 * e.g. 1250.50 -> "One Thousand Two Hundred Fifty US Dollars and Fifty Cents Only."
 */
export function numberToEnglishWords(amount: number, currency: 'USD' | 'VND' = 'USD'): string {
  if (isNaN(amount) || amount === 0) {
    return currency === 'USD' ? 'Zero US Dollars Only.' : 'Zero Vietnamese Dong Only.';
  }

  const absAmount = Math.abs(amount);
  const intPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - intPart) * 100);

  if (intPart === 0 && decimalPart === 0) {
    return currency === 'USD' ? 'Zero US Dollars Only.' : 'Zero Vietnamese Dong Only.';
  }

  const groups: number[] = [];
  let temp = intPart;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let textParts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      const gText = convertThreeDigitEn(val);
      const scale = EN_SCALES[i];
      textParts.push(scale ? `${gText} ${scale}` : gText);
    }
  }

  let result = textParts.join(', ');
  if (!result) result = 'Zero';

  if (currency === 'USD') {
    result += intPart === 1 ? ' US Dollar' : ' US Dollars';
    if (decimalPart > 0) {
      const centText = convertThreeDigitEn(decimalPart);
      result += ` and ${centText} ${decimalPart === 1 ? 'Cent' : 'Cents'}`;
    }
  } else {
    result += ' Vietnamese Dong';
  }

  return `${result} Only.`;
}
