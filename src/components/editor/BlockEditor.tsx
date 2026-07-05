import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { cn, v4 } from '@/lib/utils';
import {
  Heading1, Heading2, Heading3, ListChecks, ChevronRight,
  Code, List, ListOrdered, Minus, Quote, Type, ListIcon, Image, GripVertical,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block, BlockType } from '@/types';

interface SlashCommand {
  id: string;
  label: string;
  icon: React.ReactNode;
  type?: BlockType;
  meta?: Record<string, unknown>;
  description: string;
  children?: SlashCommand[];
}

function filterCommands(commands: SlashCommand[], filter: string): SlashCommand[] {
  if (!filter) return commands;
  const f = filter.toLowerCase();
  return commands.filter((c) => {
    if (c.children) {
      const hasMatchingChild = c.children.some((ch) => ch.label.includes(f) || ch.id.includes(f));
      return c.label.includes(f) || c.id.includes(f) || hasMatchingChild;
    }
    return c.label.includes(f) || c.id.includes(f);
  });
}

export function BlockEditor({ content, onChange }: BlockEditorProps) {
  const { t, language } = useTranslation();

  const SLASH_COMMANDS: SlashCommand[] = [
    { id: 'paragraph', label: t('slash.text'), icon: <Type size={16} />, type: 'paragraph', description: t('slash.textDesc') },
    {
      id: 'heading', label: t('slash.heading'), icon: <Heading1 size={16} />, description: t('slash.headingDesc'),
      children: [
        { id: 'h1', label: t('slash.heading1'), icon: <Heading1 size={16} />, type: 'heading', meta: { level: 1 }, description: t('slash.heading1Desc') },
        { id: 'h2', label: t('slash.heading2'), icon: <Heading2 size={16} />, type: 'heading', meta: { level: 2 }, description: t('slash.heading2Desc') },
        { id: 'h3', label: t('slash.heading3'), icon: <Heading3 size={16} />, type: 'heading', meta: { level: 3 }, description: t('slash.heading3Desc') },
      ],
    },
    {
      id: 'list', label: t('slash.list'), icon: <ListIcon size={16} />, description: t('slash.listDesc'),
      children: [
        { id: 'todo', label: t('slash.todo'), icon: <ListChecks size={16} />, type: 'todo', description: t('slash.todoDesc') },
        { id: 'bullet', label: t('slash.bullet'), icon: <List size={16} />, type: 'bullet', description: t('slash.bulletDesc') },
        { id: 'numbered', label: t('slash.numbered'), icon: <ListOrdered size={16} />, type: 'numbered', description: t('slash.numberedDesc') },
      ],
    },
    { id: 'quote', label: t('slash.quote'), icon: <Quote size={16} />, type: 'quote', description: t('slash.quoteDesc') },
    { id: 'code', label: t('slash.code'), icon: <Code size={16} />, type: 'code', description: t('slash.codeDesc') },
    {
      id: 'image', label: t('slash.image'), icon: <Image size={16} />, description: t('slash.imageDesc'),
      children: [
        { id: 'image-url', label: t('slash.imageUrl'), icon: <Image size={16} />, type: 'image', meta: { source: 'url' }, description: t('slash.imageUrlDesc') },
        { id: 'image-local', label: t('slash.imageLocal'), icon: <Image size={16} />, type: 'image', meta: { source: 'local' }, description: t('slash.imageLocalDesc') },
      ],
    },
    { id: 'divider', label: t('slash.divider'), icon: <Minus size={16} />, type: 'divider', description: t('slash.dividerDesc') },
  ];

  const [blocks, setBlocks] = useState<Block[]>(() => markdownToBlocks(content));
  const containerRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef(content);

  // 当 content 从外部变化时（切换笔记、首次加载），重新解析 blocks
  useEffect(() => {
    if (content !== prevContentRef.current) {
      prevContentRef.current = content;
      setBlocks(markdownToBlocks(content));
    }
  }, [content]);

  // 当内部 blocks 变化时，同步 prevContentRef 避免循环
  // 在 onChange 回调中更新 prevContentRef
  const notifyChange = useCallback((newBlocks: Block[]) => {
    const serialized = serializeBlocks(newBlocks);
    prevContentRef.current = serialized;
    onChange(serialized);
  }, [onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const fromIdx = prev.findIndex((b) => b.id === active.id);
      const toIdx = prev.findIndex((b) => b.id === over.id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      notifyChange(next);
      return next;
    });
  }, [onChange]);

  const focusBlock = useCallback((blockId: string) => {
    setTimeout(() => {
      const el = containerRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
      if (el) {
        el.focus();
        placeCaretAtEnd(el);
      }
    }, 0);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      notifyChange(next);
      return next;
    });
  }, [onChange]);

  const addBlock = useCallback((afterId: string, type: BlockType = 'paragraph', initialContent: string = '', meta?: Record<string, unknown>) => {
    const newId = v4();
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId);
      const newBlock: Block = { id: newId, type, content: initialContent, meta };
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      notifyChange(next);
      return next;
    });
    // 回车后聚焦到新块
    focusBlock(newId);
  }, [onChange, focusBlock]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((b) => b.id === id);
      if (idx <= 0) return prev;
      // 如果前一个块是分隔线，只删分隔线，保留当前空行
      const prevBlock = prev[idx - 1];
      if (prevBlock.type === 'divider') {
        const next = prev.filter((_, i) => i !== idx - 1);
        notifyChange(next);
        // 聚焦到当前空行
        focusBlock(prev[idx].id);
        return next;
      }
      const next = prev.filter((b) => b.id !== id);
      notifyChange(next);
      focusBlock(prev[idx - 1].id);
      return next;
    });
  }, [onChange, focusBlock]);

  const revertBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.id === id ? { ...b, type: 'paragraph' as BlockType, content: '', meta: undefined } : b
      );
      notifyChange(next);
      return next;
    });
  }, [onChange]);

  const addDivider = useCallback((afterId: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === afterId);
      const divider: Block = { id: v4(), type: 'divider', content: '' };
      const empty: Block = { id: v4(), type: 'paragraph', content: '' };
      const next = [...prev];
      next.splice(idx + 1, 0, divider, empty);
      notifyChange(next);
      return next;
    });
  }, [onChange]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 py-4" ref={containerRef}>
          {blocks.map((block) => (
            <EditableBlock
              key={block.id}
              block={block}
              slashCommands={SLASH_COMMANDS}
              t={t}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onEnter={(splitContent) => addBlock(block.id, 'paragraph', splitContent)}
              onBackspace={() => removeBlock(block.id)}
              onRevert={() => revertBlock(block.id)}
              onAddDivider={() => addDivider(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
}

interface EditableBlockProps {
  block: Block;
  slashCommands: SlashCommand[];
  t: (key: string, params?: Record<string, string | number>) => string;
  onUpdate: (updates: Partial<Block>) => void;
  onEnter: (splitContent: string) => void;
  onBackspace: () => void;
  onRevert: () => void;
  onAddDivider: () => void;
}

function EditableBlock({ block, slashCommands, t, onUpdate, onEnter, onBackspace, onRevert, onAddDivider }: EditableBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const [subMenuParent, setSubMenuParent] = useState<SlashCommand | null>(null);
  const [subIdx, setSubIdx] = useState(0);
  const [isEmpty, setIsEmpty] = useState(block.content.trim().length === 0);
  const [imageUrlOpen, setImageUrlOpen] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');
  const imageUrlInputRef = useRef<HTMLInputElement>(null);

  // 同步外部 content 变化（如 revert、回车分割等）到 isEmpty
  useEffect(() => {
    setIsEmpty(block.content.trim().length === 0);
  }, [block.content]);

  if (!hasMounted.current && ref.current) {
    ref.current.innerText = block.content;
  }

  const visibleCommands = subMenuParent && subMenuParent.children
    ? subMenuParent.children
    : filterCommands(slashCommands, slashFilter);

  const currentIdx = subMenuParent ? subIdx : slashIdx;

  const showSlashMenu = () => {
    const el = ref.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getClientRects()[0];
    if (!rect) return;
    const top = rect.bottom + 6;
    const left = Math.min(rect.left, window.innerWidth - 220);
    setSlashPos({ top, left });
    setSlashIdx(0);
    setSlashFilter('');
    setSubMenuParent(null);
    setSubIdx(0);
    setSlashOpen(true);
  };

  const hideSlashMenu = () => {
    setSlashOpen(false);
    setSlashFilter('');
    setSubMenuParent(null);
  };

  const goBack = () => {
    setSubMenuParent(null);
    setSubIdx(0);
    setSlashIdx(0);
  };

  const applySlashCommand = (command: SlashCommand) => {
    const el = ref.current;
    if (!el) return;
    hideSlashMenu();
    if (command.type === 'divider') {
      onAddDivider();
      return;
    }
    if (command.id === 'image-url') {
      el.innerText = '';
      setImageUrlValue('');
      setImageUrlOpen(true);
      setTimeout(() => imageUrlInputRef.current?.focus(), 100);
      return;
    }
    if (command.id === 'image-local') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          el.innerText = '';
          onUpdate({ content: '' });
          setTimeout(() => placeCaretAtEnd(el), 0);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          onUpdate({ type: 'image', content: '', meta: { src: reader.result as string } });
          onEnter('');
        };
        reader.readAsDataURL(file);
      };
      input.click();
      el.innerText = '';
      return;
    }
    onUpdate({ type: command.type || 'paragraph', content: '', meta: command.meta });
    el.innerText = '';
    setTimeout(() => placeCaretAtEnd(el), 0);
  };

  const handleClickCommand = (command: SlashCommand, e: React.MouseEvent) => {
    e.preventDefault();
    if (command.children) {
      setSubMenuParent(command);
      setSubIdx(0);
      return;
    }
    applySlashCommand(command);
  };

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    const text = el.innerText;

    if (slashOpen) {
      if (text === '/') {
        setSlashFilter('');
        return;
      }
      if (text.startsWith('/')) {
        setSlashFilter(text.slice(1).toLowerCase());
        setSubMenuParent(null);
        return;
      }
      hideSlashMenu();
      return;
    }

    if (block.type === 'paragraph' && text === '/') {
      showSlashMenu();
      setIsEmpty(false);
      return;
    }

    // Markdown 快捷语法检测
    if (text.startsWith('### ') && block.type !== 'heading') {
      el.innerText = text.slice(4);
      onUpdate({ type: 'heading', content: text.slice(4), meta: { level: 3 } });
      placeCaretAtEnd(el);
    } else if (text.startsWith('## ') && block.type !== 'heading') {
      el.innerText = text.slice(3);
      onUpdate({ type: 'heading', content: text.slice(3), meta: { level: 2 } });
      placeCaretAtEnd(el);
    } else if (text.startsWith('# ') && block.type !== 'heading') {
      el.innerText = text.slice(2);
      onUpdate({ type: 'heading', content: text.slice(2), meta: { level: 1 } });
      placeCaretAtEnd(el);
    } else if (text.startsWith('> ') && block.type !== 'quote') {
      el.innerText = text.slice(2);
      onUpdate({ type: 'quote', content: text.slice(2) });
      placeCaretAtEnd(el);
    } else if (text.startsWith('```') && block.type !== 'code') {
      el.innerText = '';
      onUpdate({ type: 'code', content: '' });
      placeCaretAtEnd(el);
    } else if (text.startsWith('- [ ] ') && block.type !== 'todo') {
      el.innerText = text.slice(6);
      onUpdate({ type: 'todo', content: text.slice(6), meta: { checked: false } });
      placeCaretAtEnd(el);
    } else if (text.startsWith('- [x] ') && block.type !== 'todo') {
      el.innerText = text.slice(6);
      onUpdate({ type: 'todo', content: text.slice(6), meta: { checked: true } });
      placeCaretAtEnd(el);
    } else if (text.startsWith('- ') && block.type !== 'bullet') {
      el.innerText = text.slice(2);
      onUpdate({ type: 'bullet', content: text.slice(2) });
      placeCaretAtEnd(el);
    } else if (/^1\.\s/.test(text) && block.type !== 'numbered') {
      el.innerText = text.slice(3);
      onUpdate({ type: 'numbered', content: text.slice(3) });
      placeCaretAtEnd(el);
    } else if (text === '---' && block.type !== 'divider') {
      el.innerText = '';
      onUpdate({ type: 'divider', content: '' });
    } else {
      onUpdate({ content: text });
    }
    setIsEmpty(el.innerText.trim().length === 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;

    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (subMenuParent) {
          setSubIdx((prev) => Math.min(prev + 1, (visibleCommands.length - 1)));
        } else {
          setSlashIdx((prev) => Math.min(prev + 1, (visibleCommands.length - 1)));
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (subMenuParent) {
          setSubIdx((prev) => Math.max(prev - 1, 0));
        } else {
          setSlashIdx((prev) => Math.max(prev - 1, 0));
        }
        return;
      }
      if (e.key === 'ArrowRight' && !subMenuParent) {
        e.preventDefault();
        const cmd = visibleCommands[slashIdx];
        if (cmd && cmd.children) {
          setSubMenuParent(cmd);
          setSubIdx(0);
        }
        return;
      }
      if (e.key === 'ArrowLeft' && subMenuParent) {
        e.preventDefault();
        goBack();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = visibleCommands[currentIdx];
        if (cmd) {
          if (cmd.children && !subMenuParent) {
            setSubMenuParent(cmd);
            setSubIdx(0);
          } else {
            applySlashCommand(cmd);
          }
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (subMenuParent) {
          goBack();
        } else {
          hideSlashMenu();
          el.innerText = '';
          onUpdate({ content: '' });
        }
        return;
      }
      if (e.key === 'Backspace') {
        if (slashFilter.length === 0 && !subMenuParent) {
          e.preventDefault();
          hideSlashMenu();
          el.innerText = '';
          onUpdate({ content: '' });
          return;
        }
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'divider' || block.type === 'image') return;
      if (block.type === 'code') {
        e.preventDefault();
        const sel = window.getSelection();
        const offset = sel?.getRangeAt(0).startOffset || 0;
        const text = el.innerText;
        const before = text.slice(0, offset);
        const after = text.slice(offset);
        el.innerText = before + '\n' + after;
        onUpdate({ content: before + '\n' + after });
        const range = document.createRange();
        range.setStart(el.childNodes[0] || el, before.length + 1);
        range.collapse(true);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return;
      }
      e.preventDefault();
      const sel = window.getSelection();
      const offset = sel?.getRangeAt(0).startOffset || el.innerText.length;
      const text = el.innerText;
      const before = text.slice(0, offset);
      const after = text.slice(offset);
      el.innerText = before;
      onUpdate({ content: before });
      onEnter(after);
      return;
    }

    if (e.key === 'Backspace' && el.innerText.trim().length === 0) {
      e.preventDefault();
      if (block.type !== 'paragraph') {
        onRevert();
      } else {
        onBackspace();
      }
    }
  };

  const handleToggleTodo = () => {
    if (block.type !== 'todo') return;
    const checked = !(block.meta?.checked as boolean);
    onUpdate({ meta: { ...block.meta, checked } });
  };

  const captionRef = useRef<HTMLDivElement>(null);
  const captionHasMounted = useRef(false);

  const handleImageUrlConfirm = () => {
    setImageUrlOpen(false);
    if (!imageUrlValue.trim()) return;
    onUpdate({ type: 'image', content: '', meta: { src: imageUrlValue.trim() } });
    onEnter('');
  };

  const handleImageUrlCancel = () => {
    setImageUrlOpen(false);
  };

  const handleImageUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleImageUrlConfirm();
    }
    if (e.key === 'Escape') {
      handleImageUrlCancel();
    }
  };

  const handleImageKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onRevert();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onEnter('');
    }
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter('');
    }
  };

  const headingLevel = (block.meta?.level as number) || 1;
  const headingStyle = headingLevel === 1
    ? 'text-2xl font-bold'
    : headingLevel === 2
      ? 'text-xl font-bold'
      : 'text-lg font-semibold';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-2 rounded-lg px-3 py-1.5 -mx-3 hover:bg-apple-grayHover/30 dark:hover:bg-apple-dark-grayHover/30 transition-colors',
        block.type === 'code' && 'bg-apple-gray/80 dark:bg-apple-dark-gray/80 hover:bg-apple-gray dark:hover:bg-apple-dark-gray font-mono text-sm text-apple-text dark:text-apple-dark-text',
        block.type === 'quote' && 'border-l-2 border-apple-textSecondary/30 dark:border-apple-dark-textSecondary/30 pl-3 italic text-apple-text/80 dark:text-apple-dark-text/80',
        block.type === 'divider' && 'justify-center py-1',
        isDragging && 'opacity-50 z-50 bg-apple-surface dark:bg-apple-dark-surface',
      )}
      {...attributes}
    >
      <div
        className={cn(
          'opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0 transition-opacity touch-none',
          block.type === 'image' ? 'mt-1.5' : 'self-center',
        )}
        {...listeners}
      >
        <GripVertical size={14} className="text-apple-textSecondary/40 dark:text-apple-dark-textSecondary/40" />
      </div>
      {block.type === 'todo' && (
        <button
          type="button"
          onClick={handleToggleTodo}
          className={cn(
            'mt-1.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
            block.meta?.checked
              ? 'bg-apple-blue dark:bg-apple-dark-blue border-apple-blue dark:border-apple-dark-blue text-white'
              : 'border-apple-textSecondary/40 dark:border-apple-dark-textSecondary/40 hover:border-apple-blue dark:hover:border-apple-dark-blue'
          )}
        >
          {block.meta?.checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}
      {block.type === 'bullet' && (
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-apple-textSecondary dark:bg-apple-dark-textSecondary shrink-0" />
      )}
      {block.type === 'numbered' && (
        <span className="mt-1 w-5 text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary shrink-0 font-medium text-right">1.</span>
      )}

      {block.type === 'divider' ? (
        <div className="flex-1 border-t border-apple-border dark:border-apple-dark-border" />
      ) : block.type === 'image' ? (
        <div className="flex-1 flex flex-col items-center outline-none" tabIndex={0} onKeyDown={handleImageKeyDown}>
          <img
            src={block.meta?.src as string || ''}
            alt=""
            className="max-w-full max-h-[400px] rounded-lg object-contain block mx-auto"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div
            ref={(node) => {
              if (node && !captionHasMounted.current) {
                node.innerText = (block.meta?.caption as string) || '';
                captionHasMounted.current = true;
              }
              captionRef.current = node;
            }}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              onUpdate({ meta: { ...block.meta, caption: (e.currentTarget as HTMLElement).innerText } });
            }}
            onKeyDown={handleCaptionKeyDown}
            className="mt-2 text-sm text-apple-textSecondary/70 dark:text-apple-dark-textSecondary/70 text-center outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-apple-textSecondary/40 dark:empty:before:text-apple-dark-textSecondary/40"
            data-placeholder={t('block.image.caption')}
          />
        </div>
      ) : (
        <div className="flex-1 relative">
          <div
            ref={(node) => {
              if (node) {
                ref.current = node;
                if (!hasMounted.current) {
                  node.innerText = block.content;
                  hasMounted.current = true;
                }
              }
            }}
            data-block-id={block.id}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className={cn(
              'outline-none text-apple-text dark:text-apple-dark-text',
              block.type === 'heading' && headingStyle,
              block.type === 'code' && 'font-mono text-sm',
              block.type === 'todo' && (block.meta?.checked ? 'text-apple-textSecondary dark:text-apple-dark-textSecondary line-through' : ''),
            )}
          />
          {isEmpty && !slashOpen && (
            <span className={cn(
              'absolute left-0 top-0 pointer-events-none text-apple-textSecondary/50 dark:text-apple-dark-textSecondary/50 opacity-0 group-hover:opacity-100 transition-opacity select-none',
              block.type === 'heading' && headingStyle,
            )}>
              {block.type === 'heading' ? t('block.placeholder.heading', { level: headingLevel }) :
               block.type === 'code' ? t('block.placeholder.code') :
               block.type === 'quote' ? t('block.placeholder.quote') :
               t('block.placeholder')}
            </span>
          )}
        </div>
      )}

      {slashOpen && (
        <div
          className="fixed z-[200] w-56 bg-white dark:bg-apple-dark-surface rounded-xl border border-apple-border dark:border-apple-dark-border overflow-hidden"
          style={{ top: slashPos.top, left: slashPos.left }}
        >
          {subMenuParent && (
            <div className="px-3 py-1.5 flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); goBack(); }}
                className="text-xs text-apple-blue dark:text-apple-dark-blue hover:underline"
              >
               {t('block.back')}
              </button>
              <span className="text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary ml-1">{subMenuParent.label}</span>
            </div>
          )}
          <div className="py-1">
            {visibleCommands.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-apple-textSecondary dark:text-apple-dark-textSecondary">{t('block.noCommands')}</div>
            ) : (
              visibleCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseDown={(e) => handleClickCommand(cmd, e)}
                  onMouseEnter={() => subMenuParent ? setSubIdx(idx) : setSlashIdx(idx)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    idx === currentIdx ? 'bg-apple-blue/8 dark:bg-apple-dark-blue/8 text-apple-blue dark:text-apple-dark-blue' : 'text-apple-text dark:text-apple-dark-text hover:bg-apple-grayHover/50 dark:hover:bg-apple-dark-grayHover/50'
                  )}
                >
                  <span className={cn('w-8 h-8 flex items-center justify-center rounded-lg',
                    idx === currentIdx ? 'bg-apple-blue/15 dark:bg-apple-dark-blue/15 text-apple-blue dark:text-apple-dark-blue' : 'bg-apple-gray dark:bg-apple-dark-gray text-apple-textSecondary dark:text-apple-dark-textSecondary'
                  )}>
                    {cmd.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{cmd.label}</div>
                    <div className="text-xs text-apple-textSecondary dark:text-apple-dark-textSecondary">{cmd.description}</div>
                  </div>
                  {cmd.children && !subMenuParent && (
                    <ChevronRight size={14} className="text-apple-textSecondary dark:text-apple-dark-textSecondary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {imageUrlOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30">
          <div className="w-[420px] max-w-[90vw] bg-white dark:bg-apple-dark-surface rounded-2xl overflow-hidden">
            <div className="h-12 flex items-center px-5">
              <h2 className="font-semibold text-apple-text dark:text-apple-dark-text">{t('block.image.insert')}</h2>
            </div>
            <div className="p-5">
              <input
                ref={imageUrlInputRef}
                type="text"
                value={imageUrlValue}
                onChange={(e) => setImageUrlValue(e.target.value)}
                onKeyDown={handleImageUrlKeyDown}
                placeholder={t('block.image.insert')}
                className="w-full h-10 px-3 text-sm bg-apple-bg dark:bg-apple-dark-bg border border-apple-border dark:border-apple-dark-border rounded-lg outline-none focus:border-apple-blue dark:focus:border-apple-dark-blue"
              />
            </div>
            <div className="h-14 flex items-center justify-end gap-2 px-5 bg-apple-bg dark:bg-apple-dark-bg">
              <button
                type="button"
                onClick={handleImageUrlCancel}
                className="px-4 h-8 text-sm font-medium text-apple-textSecondary dark:text-apple-dark-textSecondary hover:text-apple-text dark:hover:text-apple-dark-text"
              >
                {t('newFolder.cancel')}
              </button>
              <button
                type="button"
                onClick={handleImageUrlConfirm}
                disabled={!imageUrlValue.trim()}
                className="px-4 h-8 text-sm font-medium text-white bg-apple-blue dark:bg-apple-dark-blue hover:bg-apple-blueHover dark:hover:bg-apple-dark-blueHover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('block.insert')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function placeCaretAtEnd(el: HTMLElement | null) {
  if (!el) return;
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function markdownToBlocks(content: string): Block[] {
  if (!content.trim()) return [{ id: v4(), type: 'paragraph', content: '' }];
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let currentCode: string[] | null = null;
  let inCodeBlock = false;

  const flushCode = () => {
    if (currentCode && currentCode.length > 0) {
      blocks.push({ id: v4(), type: 'code', content: currentCode.join('\n') });
    }
    currentCode = null;
    inCodeBlock = false;
  };

  for (const line of lines) {
    if (line.trim() === '```' && !inCodeBlock) {
      inCodeBlock = true;
      currentCode = [];
      continue;
    }
    if (line.trim() === '```' && inCodeBlock) {
      flushCode();
      continue;
    }
    if (inCodeBlock) {
      currentCode!.push(line);
      continue;
    }

    if (line.trim() === '---') {
      blocks.push({ id: v4(), type: 'divider', content: '' });
    } else if (line.startsWith('![') && line.includes('](')) {
      const match = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        const caption = match[1] && match[1] !== 'image' ? match[1] : '';
        blocks.push({ id: v4(), type: 'image', content: '', meta: { src: match[2], caption } });
      } else {
        blocks.push({ id: v4(), type: 'paragraph', content: line });
      }
    } else if (line.startsWith('### ')) {
      blocks.push({ id: v4(), type: 'heading', content: line.slice(4), meta: { level: 3 } });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: v4(), type: 'heading', content: line.slice(3), meta: { level: 2 } });
    } else if (line.startsWith('# ')) {
      blocks.push({ id: v4(), type: 'heading', content: line.slice(2), meta: { level: 1 } });
    } else if (line.startsWith('> ')) {
      blocks.push({ id: v4(), type: 'quote', content: line.slice(2) });
    } else if (line.startsWith('- [ ] ')) {
      blocks.push({ id: v4(), type: 'todo', content: line.slice(6), meta: { checked: false } });
    } else if (line.startsWith('- [x] ')) {
      blocks.push({ id: v4(), type: 'todo', content: line.slice(6), meta: { checked: true } });
    } else if (line.startsWith('- ')) {
      blocks.push({ id: v4(), type: 'bullet', content: line.slice(2) });
    } else if (/^1\.\s/.test(line)) {
      blocks.push({ id: v4(), type: 'numbered', content: line.slice(3) });
    } else {
      blocks.push({ id: v4(), type: 'paragraph', content: line });
    }
  }
  flushCode();
  return blocks;
}

function serializeBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'heading': {
          const level = (b.meta?.level as number) || 1;
          return `${'#'.repeat(level)} ${b.content}`;
        }
        case 'todo':
          return `- [${b.meta?.checked ? 'x' : ' '}] ${b.content}`;
        case 'quote':
          return `> ${b.content}`;
        case 'code':
          return b.content ? `\`\`\`\n${b.content}\n\`\`\`` : '';
        case 'bullet':
          return `- ${b.content}`;
        case 'numbered':
          return `1. ${b.content}`;
        case 'divider':
          return '\n---\n';
        case 'image':
          return `![${b.meta?.caption || 'image'}](${b.meta?.src || ''})`;
        default:
          return b.content;
      }
    })
    .join('\n');
}