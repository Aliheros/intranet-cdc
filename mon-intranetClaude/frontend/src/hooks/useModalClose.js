import { useState } from 'react';

/**
 * Hook to animate modal closing before unmounting.
 * Use `handleClose` instead of `onClose` for all dismiss actions.
 * Duration must match the `modalExit` CSS animation duration.
 */
export function useModalClose(onClose, duration = 240) {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      if (typeof onClose === 'function') onClose();
      setIsClosing(false); // reset pour la prochaine ouverture (composant non-démonté)
    }, duration);
  };
  return { isClosing, handleClose };
}
