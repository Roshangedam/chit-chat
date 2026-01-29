/**
 * Dynamic Favicon with Unread Badge
 * Updates browser tab icon with notification count
 * 
 * Features:
 * - Shows clean icon when no unread messages
 * - Overlays red badge with count when messages exist
 * - Real-time updates
 * - Works in all modern browsers
 */

class FaviconBadge {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 128;
        this.canvas.height = 128;
        this.ctx = this.canvas.getContext('2d');
        this.originalFavicon = null;
        this.faviconEl = null;
        this.imageLoaded = false;

        this.init();
    }

    async init() {
        // Get or create favicon link element
        this.faviconEl = document.querySelector('link[rel="icon"]');
        if (!this.faviconEl) {
            this.faviconEl = document.createElement('link');
            this.faviconEl.rel = 'icon';
            this.faviconEl.type = 'image/png';
            document.head.appendChild(this.faviconEl);
        }

        // Load original favicon
        await this.loadOriginalFavicon();
    }

    loadOriginalFavicon() {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.originalFavicon = img;
                this.imageLoaded = true;
                resolve();
            };
            img.onerror = () => {
                // Create fallback icon
                this.createFallbackIcon();
                resolve();
            };
            img.src = '/favicon.png';
        });
    }

    createFallbackIcon() {
        // Create a simple chat bubble icon as fallback
        const ctx = this.ctx;
        const size = 64;

        // Background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(4, 4, size - 8, size - 8, 12);
        ctx.fill();

        // Chat bubble
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(32, 28, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, 38);
        ctx.lineTo(26, 48);
        ctx.lineTo(32, 38);
        ctx.fill();

        // Save as original
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        tempCanvas.getContext('2d').drawImage(this.canvas, 0, 0);

        const img = new Image();
        img.src = tempCanvas.toDataURL();
        this.originalFavicon = img;
        this.imageLoaded = true;
    }

    /**
     * Update favicon with badge count
     * @param {number} count - Unread count (0 = no badge)
     */
    setBadge(count) {
        if (!this.imageLoaded) {
            // Retry after image loads
            setTimeout(() => this.setBadge(count), 100);
            return;
        }

        const ctx = this.ctx;
        const size = 128;  // Larger canvas

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw original icon - FILL 100% of canvas
        if (this.originalFavicon) {
            ctx.drawImage(this.originalFavicon, 0, 0, size, size);
        }

        // If count > 0, draw badge at TOP-RIGHT
        if (count > 0) {
            const badgeText = count > 99 ? '99+' : count.toString();
            const badgeSize = badgeText.length > 2 ? 64 : 56;  // Bigger badge
            const badgeX = size - badgeSize + 8;
            const badgeY = -6;

            // Badge background (red circle at top-right)
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(badgeX + badgeSize / 2 - 8, badgeY + badgeSize / 2 + 8, badgeSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Badge border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Badge text - bigger font
            ctx.fillStyle = 'white';
            ctx.font = `bold ${badgeText.length > 2 ? 28 : 32}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, badgeX + badgeSize / 2 - 8, badgeY + badgeSize / 2 + 10);
        }

        // Update favicon
        this.faviconEl.href = this.canvas.toDataURL('image/png');
    }

    /**
     * Reset to original favicon (no badge)
     */
    clear() {
        this.setBadge(0);
    }
}

// Singleton instance
let faviconBadge = null;

/**
 * Initialize and get favicon badge instance
 */
export function getFaviconBadge() {
    if (!faviconBadge) {
        faviconBadge = new FaviconBadge();
    }
    return faviconBadge;
}

/**
 * Update favicon badge with count
 * @param {number} count - Unread message count
 */
export function updateFaviconBadge(count) {
    getFaviconBadge().setBadge(count);
}

/**
 * Clear favicon badge
 */
export function clearFaviconBadge() {
    getFaviconBadge().clear();
}

export default FaviconBadge;
