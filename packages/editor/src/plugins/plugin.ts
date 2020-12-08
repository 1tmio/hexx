import { useAtom } from 'jotai';
import {
  editorDefaultBlockAtom,
  editorWrapperAtom,
} from '../constants/atom';
import { useEditor } from '../hooks';
import { useActiveBlockId } from '../hooks/use-active-element';
export function usePlugin() {
  const [wrapperRef] = useAtom(editorWrapperAtom);
  const [defaultBlock] = useAtom(editorDefaultBlockAtom);
  const editor = useEditor();
  const activeBlock = useActiveBlockId();

  return {
    wrapperRef,
    editor,
    defaultBlock,
    activeBlock,
  };
}