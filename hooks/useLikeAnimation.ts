import { useState } from 'react';

export function useLikeAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerLikeAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return {
    isAnimating,
    triggerLikeAnimation,
  };
}
