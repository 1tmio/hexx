import { useAtom } from 'jotai';
import {
  createElement,
  forwardRef,
  Fragment,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { useEditor } from 'src/hooks/use-editor';
import { styled } from 'src/stitches.config';
import {
  getSelectionRange,
  removeRanges,
} from 'src/utils/remove-ranges';
import {
  blockMapAtom,
  editorIdAtom,
  isSelectAllAtom,
} from '../../constants/atom';
import { BlockType } from '../editor';
import DragIndicator from '../icons/drag-indicator';
import PlusSvg from '../icons/plus';
import { useReactPopper } from '../virtual-popper/use-virtual-popper';
import { PortalPopper } from '../virtual-popper/virtual-popper';
import {
  findBlockByIndex,
  findContentEditable,
  focusBlockByIndex,
  focusLastBlock,
  lastCursor,
} from '../../utils/find-blocks';
import { TextBlock } from './text';
import { BackspaceKey, commandKey } from 'src/constants/key';
import { isEditableSelectAll } from '../editable';
import composeRefs from 'src/hooks/use-compose-ref';

const Menu = styled('div', {
  opacity: 0,
  position: 'relative',
});

const Wrapper = styled('div', {
  width: '100%',
  position: 'relative',
  marginTop: '1px',
  marginBottom: '1px',
  [`:hover ${Menu}`]: {
    opacity: 1,
    transition: 'opacity 20ms ease-in 0s',
  },
});

const Plus = styled('div', {
  userSelect: 'none',
  cursor: 'pointer',
  fontSize: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(55, 53, 47, 0.3)',
  position: 'absolute',
  top: 3,
  left: '-24px',
  width: 24,
  height: 24,
  borderRadius: 3,
  pointerEvents: 'auto',
});

const Drag = styled('div', {
  userSelect: 'none',
  position: 'absolute',
  top: 3,
  right: '-24px',
  pointerEvents: 'auto',
  cursor: '-webkit-grab',
  borderRadius: 3,
  fontSize: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(55, 53, 47, 0.3)',
});

const SelectOverlay = styled('div', {
  position: 'absolute',
  pointerEvents: 'none',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: '#2BC3A8',
  zIndex: 81,
  opacity: 0.2,
});

function useBlock({
  block,
  index,
}: {
  block: BlockType;
  index: number;
}) {
  const { insertBlock, removeBlockWithId } = useEditor();
  const [blocksMap] = useAtom(blockMapAtom);
  const [editorId] = useAtom(editorIdAtom);
  const [isSelectAll, setIsSelectAll] = useAtom(isSelectAllAtom);
  const ref = useRef<HTMLDivElement>(null);

  const currentBlock = blocksMap[block.type];

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      const range = getSelectionRange();
      if (range.startOffset === 0) {
        focusBlockByIndex(index - 1);
      }
    }
    if (e.key === 'ArrowDown') {
      const range = getSelectionRange();
      if (
        !(range.commonAncestorContainer as Text)?.length ||
        ((range.commonAncestorContainer as Text)?.length ===
          range.endOffset &&
          range.collapsed)
      ) {
        focusBlockByIndex(index + 1, true);
      }
    }
    if (!e.shiftKey && e.key === 'Enter') {
      insertBlock({
        index: index + 1,
        block: {
          type: TextBlock.block.type,
          data: TextBlock.block.defaultValue,
        },
      });
      e.preventDefault();
    }
    if (e[commandKey] && e.key === 'a') {
      if (isSelectAll) {
        e.preventDefault();
      }
      if (isEditableSelectAll()) {
        setIsSelectAll(true);
        removeRanges();
        e.preventDefault();
      }
      return;
    }
    if (e.key === BackspaceKey) {
      if (
        ((typeof currentBlock.block.isEmpty === 'function' &&
          currentBlock.block.isEmpty(block.data)) ||
          Object.keys(block.data).length === 0) &&
        index !== 0
      ) {
        removeBlockWithId({ id: block.id });
        requestAnimationFrame(() => {
          const previousBlock = findBlockByIndex(index - 1);
          if (!previousBlock) {
            focusLastBlock();
          } else {
            previousBlock.editable?.focus();
          }
          lastCursor();
        });
      }
    }
    setIsSelectAll(false);
  };

  return {
    editorId,
    blockComponent: currentBlock,
    getBlockProps: () => ({
      'data-block-id': block.id,
      className: 'e-block',
      onKeyDown,
    }),
    isSelectAll,
  };
}

export interface BlockProps<T = any> {
  block: BlockType;
  index: number;
  config?: T;
}
export function Block({ block, index }: BlockProps) {
  const { getBlockProps, isSelectAll, blockComponent } = useBlock({
    block,
    index,
  });

  const [fontSize, setFontSize] = useState<number>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let wrapper = ref.current;
    if (wrapper) {
      const editable = findContentEditable(wrapper, true);
      if (editable) {
        const computedFontSize = window.getComputedStyle(editable)[
          'font-size'
        ];
        if (computedFontSize) {
          setFontSize(parseInt(computedFontSize, 10));
        }
      }
    }
  }, []);

  return (
    <Draggable draggableId={block.id} index={index}>
      {(provided) => (
        <Wrapper
          ref={composeRefs(provided.innerRef, ref) as any}
          {...provided.draggableProps}
          {...getBlockProps()}
        >
          <Menu
            style={{
              top: fontSize
                ? fontSize - 24 > 0
                  ? fontSize - 24
                  : 0
                : 0,
            }}
          >
            <DragButton {...provided.dragHandleProps} />
            <PlusButton index={index} />
          </Menu>
          {createElement(blockComponent, {
            block,
            index,
            config: blockComponent.block.config,
          })}
          {isSelectAll && <SelectOverlay />}
        </Wrapper>
      )}
    </Draggable>
  );
}

const DragButton = forwardRef((props, ref) => {
  return (
    <Drag ref={ref as any} {...props}>
      <DragIndicator />
    </Drag>
  );
});

const AddMenu = styled('div', {
  background: 'black',
  borderRadius: 4,
  display: 'flex',
  fontSize: '18px',
  padding: 6,
  color: 'white',
  svg: {
    cursor: 'pointer',
  },
});

function PlusButton({
  onClick,
  index,
}: {
  onClick?: () => void;
  index: number;
}) {
  const [blocksMap] = useAtom(blockMapAtom);
  const popper = useReactPopper({
    placement: 'right',
  });
  const { insertBlock } = useEditor();

  return (
    <>
      <Plus
        ref={popper.setReferenceElement}
        onClick={(e) => {
          popper.setActive(true);
          onClick?.();
          e.stopPropagation();
        }}
      >
        <PlusSvg />
      </Plus>
      <PortalPopper popper={popper}>
        <AddMenu>
          {Object.entries(blocksMap).map(([key, blockType]) => (
            <Fragment key={key}>
              {createElement(blockType.block.icon.svg, {
                onClick: (e: MouseEvent) => {
                  insertBlock({
                    block: {
                      type: blockType.block.type,
                      data: blockType.block.defaultValue,
                    },
                    index: index + 1,
                  });
                  popper.setActive(false);
                  e.stopPropagation();
                },
              })}
            </Fragment>
          ))}
        </AddMenu>
      </PortalPopper>
    </>
  );
}
