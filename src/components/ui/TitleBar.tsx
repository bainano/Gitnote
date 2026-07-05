import { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, MessageSquare } from 'lucide-react';

const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (api?.isMaximized) {
      api.isMaximized().then(setMaximized);
    }
    if (api?.onMaximizeChange) {
      return api.onMaximizeChange((val: boolean) => setMaximized(val));
    }
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.minimizeWindow?.();
  };
  const handleMaximize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.maximizeWindow?.();
  };
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.closeWindow?.();
  };
  const handleFeedback = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.electronAPI?.openExternal?.('https://txc.qq.com/products/801203');
  };

  return (
    <div className="h-10 flex items-center px-4 bg-apple-bg dark:bg-apple-dark-bg border-b border-apple-borderLight dark:border-apple-dark-borderLight" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="text-sm font-medium text-apple-text dark:text-apple-dark-text select-none">栈知 Gitnote</div>
      <div className="flex-1" />
      <div className="flex items-center gap-1" style={noDrag}>
        <button
          type="button"
          onClick={handleFeedback}
          style={noDrag}
          title="反馈"
          className="w-7 h-7 flex items-center justify-center rounded-md text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover transition-colors"
        >
          <MessageSquare size={14} />
        </button>
        <button
          type="button"
          onClick={handleMinimize}
          style={noDrag}
          className="w-7 h-7 flex items-center justify-center rounded-md text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          style={noDrag}
          className="w-7 h-7 flex items-center justify-center rounded-md text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-apple-grayHover dark:hover:bg-apple-dark-grayHover transition-colors"
        >
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          onClick={handleClose}
          style={noDrag}
          className="w-7 h-7 flex items-center justify-center rounded-md text-apple-textSecondary dark:text-apple-dark-textSecondary hover:bg-red-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
