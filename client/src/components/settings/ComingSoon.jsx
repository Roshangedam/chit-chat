/**
 * Coming Soon Placeholder Component
 * For locked/future settings sections
 */

import { Lock, Sparkles } from 'lucide-react';
import './ComingSoon.css';

function ComingSoon({ title = 'Coming Soon' }) {
    return (
        <div className="coming-soon">
            <div className="coming-soon-content">
                <div className="coming-soon-icon">
                    <Lock size={32} />
                    <Sparkles className="sparkle sparkle-1" size={16} />
                    <Sparkles className="sparkle sparkle-2" size={12} />
                </div>
                <h3>{title}</h3>
                <p>This feature is currently under development.</p>
                <p className="subtitle">Stay tuned for updates!</p>
            </div>
        </div>
    );
}

export default ComingSoon;
