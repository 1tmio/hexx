import { forwardRef } from 'react';
import {
  ContentEditable,
  ContentEditableProps,
} from '../contenteditable';
import styles from './editable.module.css';

export const Editable = forwardRef<ContentEditableProps, any>(
  (props, ref) => (
    <div
      dangerouslySetInnerHTML={{ __html: props.html }}
      contentEditable
      placeholder="Type something..."
      className={styles.editable}
      ref={ref}
      {...props}
    />
  ),
);
