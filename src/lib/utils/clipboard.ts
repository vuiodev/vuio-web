/**
 * Copies text to the clipboard reliably in both secure (HTTPS/localhost)
 * and non-secure (HTTP over LAN IP) browser contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	if (typeof window === 'undefined') return false;

	// Modern Async Clipboard API (available in Secure Contexts)
	if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (err) {
			console.warn('navigator.clipboard.writeText failed, attempting execCommand fallback', err);
		}
	}

	// Legacy execCommand fallback (works in non-secure HTTP contexts on LAN)
	try {
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.setAttribute('readonly', '');
		textArea.style.position = 'fixed';
		textArea.style.top = '-9999px';
		textArea.style.left = '-9999px';
		textArea.style.opacity = '0';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		textArea.setSelectionRange(0, textArea.value.length);

		const successful = document.execCommand('copy');
		document.body.removeChild(textArea);
		return successful;
	} catch (err) {
		console.error('Failed to copy to clipboard', err);
		return false;
	}
}
