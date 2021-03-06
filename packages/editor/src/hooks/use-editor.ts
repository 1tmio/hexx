import { useAtom } from 'jotai';
import { useAtomValue } from 'jotai/utils';
import { useCallback, useEffect, useRef } from 'react';
import { v4 } from 'uuid';
import {
  blockIdListAtom,
  blockMapAtom,
  blockMapFamily,
  blockSelectAtom,
  blocksIdMapAtom,
  editorDefaultBlockAtom,
  hoverBlockAtom,
  _hexxScope,
} from '../constants/atom';
import { BlockType } from '../utils/blocks';
import { insert, insertArray } from '../utils/array';
import { useAtomCallback, useUpdateAtom } from '../utils/jotai';
import { normalize } from '../utils/normalize';
import { usePreviousExistValue } from './use-previous-exist-value';

export const EditableWeakMap = new WeakMap<
  HTMLDivElement | HTMLElement | Element,
  {
    blockIndex: number;
    index: number;
    id: string;
  }
>();

export function useBlock<T = any>(id: string, blockIndex: number) {
  const family = blockMapFamily(id);
  family.scope = _hexxScope;
  // @ts-ignore
  const [block, updateBlockIdMap] = useAtom<BlockType<T>>(family);
  const [, setIds] = useAtom(blockIdListAtom);
  const registeredRef = useRef<Array<any>>();

  const remove = () => {
    blockMapFamily.remove(id);
    setIds((s) => s.filter((s) => s !== id));
  };

  const register = useCallback(
    (ref, index: number = 0) => {
      if (typeof blockIndex === 'undefined') {
        throw new Error(
          'register editable block must provide blockIndex.',
        );
      }
      if (ref) {
        EditableWeakMap.set(ref, { index, id, blockIndex });
        registeredRef.current?.push(ref);
      }
    },
    [blockIndex],
  );

  const registerByIndex = useCallback(
    (index: number) =>
      useCallback((ref) => {
        register(ref, index);
      }, []),
    [register],
  );

  useEffect(() => {
    return () => {
      const registeredList = registeredRef.current;
      if (registeredList && registeredList.length > 0) {
        for (const registered of registeredList) {
          EditableWeakMap.delete(registered);
        }
      }
    };
  }, []);

  return {
    block,
    remove,
    update: updateBlockIdMap,
    registerByIndex,
    register,
  };
}

export function useIdMap() {
  return useAtom(blocksIdMapAtom);
}

export function useGetBlockCallback() {
  return useAtomCallback<BlockType, { id: string }>(
    useCallback((get, set, arg) => {
      const block = get(blocksIdMapAtom)[arg.id];

      return block;
    }, []),
  );
}

export type UseEditorReturn = ReturnType<typeof useEditor>;
export function useEditor() {
  const hoverBlock = useAtomValue(hoverBlockAtom);
  const blockMap = useAtomValue(blockMapAtom);
  const [blockSelect, setBlockSelect] = useAtom(blockSelectAtom);
  const defaultBlock = useAtomValue(editorDefaultBlockAtom);

  const setIdList = useUpdateAtom(blockIdListAtom);
  const setIdMap = useUpdateAtom(blocksIdMapAtom);
  const lastHoverBlock = usePreviousExistValue(hoverBlock);

  const selectBlock = (id?: string) => {
    setBlockSelect(id ? new Set([id]) : new Set([]));
  };

  const getBlock = useGetBlockCallback();

  const insertBlockAfter = useAtomCallback(
    useCallback((get, set, arg: { id: string; block: any }) => {
      let newBlock = {
        ...arg.block,
        id: v4(),
      };
      const ids = get(blockIdListAtom);
      const currentBockIndex = ids.findIndex((d) => d === arg.id);
      if (currentBockIndex > -1) {
        setIdList(insert(ids, currentBockIndex + 1, newBlock.id));
        setIdMap((s) => ({
          ...s,
          [newBlock.id]: newBlock,
        }));
      }
      return newBlock;
    }, []),
  );

  const insertBlock = useCallback(
    (arg: { index?: number; block: any }) => {
      let newBlock = {
        ...arg.block,
        id: v4(),
      };
      if (typeof arg.index === 'undefined') {
        setIdList((s) => [...s, newBlock.id]);
        setIdMap((s) => ({
          ...s,
          [newBlock.id]: newBlock,
        }));
      } else {
        setIdList((s) => insert(s, arg.index!, newBlock.id));
        setIdMap((s) => ({
          ...s,
          [newBlock.id]: newBlock,
        }));
      }
      return newBlock;
    },
    [],
  );

  const batchInsertBlocks = useCallback(
    ({ index, blocks }: { index?: number; blocks: any[] }) => {
      let newBlocks: BlockType[] = [];
      for (const block of blocks) {
        newBlocks.push({
          id: v4(),
          ...block,
        });
      }
      const { byId, ids } = normalize(newBlocks, 'id');
      if (typeof index === 'undefined') {
        setIdList((s) => [...s, ...ids]);
        setIdMap((s) => ({
          ...s,
          ...byId,
        }));
      } else {
        setIdList((s) => insertArray(s, index, ids));
        setIdMap((s) => ({
          ...s,
          ...byId,
        }));
      }
    },
    [],
  );

  const replaceBlockById = useCallback(
    ({ id, block }: { id: string; block: BlockType }) => {
      setIdList((s) => s.map((s) => (s === id ? block.id : s)));
      setIdMap((s) => ({
        ...s,
        [block.id]: block,
      }));
      blockMapFamily.remove(id);
    },
    [],
  );

  const updateBlockDataById = useCallback(
    ({ id, data }: { id: string; data: any }) => {
      setIdMap((s) => ({
        ...s,
        [id]: {
          ...s[id],
          data,
        },
      }));
    },
    [],
  );

  const removeBlockById = useCallback(({ id }: { id: string }) => {
    setIdList((s) => s.filter((s) => s !== id));
    blockMapFamily.remove(id);
  }, []);

  const batchRemoveBlocks = useCallback(
    ({ ids }: { ids: string[] }) => {
      const filterIds = (s) => !ids.includes(s);
      setIdList((s) => s.filter(filterIds));
      blockMapFamily.setShouldRemove(filterIds);
    },
    [],
  );

  const splitBlock = useCallback(
    ({
      index,
      block,
      newBlock,
      id,
    }: {
      id: string;
      index: number;
      block: any | null;
      newBlock: any;
    }) => {
      insertBlock({ index: index + 1, block: newBlock });
      if (block) {
        updateBlockDataById({
          id: block.id,
          data: block.data,
        });
      } else {
        removeBlockById({ id });
      }
    },
    [updateBlockDataById, removeBlockById, insertBlock],
  );

  const clear = useAtomCallback(
    useCallback((get, set, _?: any) => {
      const defaultBlock = get(editorDefaultBlockAtom);
      const value = {
        ...defaultBlock,
        id: v4(),
      };
      setIdList(() => [value.id]);
      setIdMap(() => ({ [value.id]: value }));
    }, []),
  );

  return {
    // method
    setIdList,
    insertBlock,
    insertBlockAfter,
    splitBlock,
    updateBlockDataById,
    replaceBlockById,
    setIdMap,
    batchRemoveBlocks,
    removeBlockById,
    batchInsertBlocks,
    clear,
    getBlock,
    // data
    defaultBlock,
    blockSelect,
    blockMap,
    hoverBlock,
    lastHoverBlock,
    selectBlock,
  };
}
