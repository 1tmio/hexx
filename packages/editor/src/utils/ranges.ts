export function removeRanges() {
  if (window.getSelection) {
    if (window.getSelection().empty) {
      // Chrome
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {
      // Firefox
      window.getSelection().removeAllRanges();
    }
  }
}

export function restoreSelection(range?: Range) {
  const selection = window.getSelection();
  if (!selection || !range) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export function getSelectionRange() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    return;
  }
  return selection.getRangeAt(0);
}

export function extractFragmentFromPosition() {
  const selectRange = getSelectionRange();
  if (!selectRange || !document.activeElement) {
    return;
  }
  selectRange.deleteContents();
  const range = selectRange.cloneRange();
  range.selectNodeContents(document.activeElement);
  range.setStart(selectRange.endContainer, selectRange.endOffset);

  let next = range.extractContents();

  const wrapper = document.createElement('div');
  wrapper.append(next);
  return {
    next: !wrapper.textContent ? '' : wrapper.innerHTML,
    // @ts-ignore
    current: range.commonAncestorContainer.innerHTML,
  };
}

export function expandToTag(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  const range = document.createRange();

  range.selectNodeContents(node);
  selection.addRange(range);
}

// FIXME: figure how to detect select all
export const isEditableSelectAll = () => {
  const sel = getSelection();
  if (!sel) return;
  if (sel.type === 'Caret') {
    if (!sel.anchorOffset && sel.isCollapsed) {
      return true;
    }
    return false;
  }
  if (sel.type === 'Range') {
    if (!sel.anchorOffset) {
      return true;
    }
    return false;
  }
};
