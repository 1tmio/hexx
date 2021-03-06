import { VirtualElement, Placement, Modifier } from '@popperjs/core';
import { useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';
import { useEventListener } from '../../hooks/use-event-listener';

export interface UseReactPopperProps {
  defaultActive?: boolean;
  onClose?: () => void;
  placement: Placement;
  modifiers?: readonly Partial<Modifier<unknown, object>>[];
}

export type UseReactPopperReturn = ReturnType<typeof useReactPopper>;

export function useReactPopper(props: UseReactPopperProps) {
  const [active, setActive] = useState(props.defaultActive);
  const popperElementRef = useRef<HTMLElement>();
  const [referenceElement, setReferenceElement] = useState<
    VirtualElement | Element | HTMLElement | any
  >();

  const popper = usePopper(
    referenceElement,
    popperElementRef.current,
    {
      placement: props.placement,
      modifiers: [...(props.modifiers || [])],
      strategy: 'fixed',
    },
  );

  useEventListener('mousedown', (e) => {
    if (
      e.target &&
      (e.target instanceof HTMLElement ||
        e.target instanceof SVGElement) &&
      popperElementRef.current?.contains(e.target)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setActive(false);
  });

  useEffect(() => {
    popper.update?.();
    if (!active) {
      props.onClose?.();
    }
  }, [active]);

  return {
    popperElement: popperElementRef.current,
    active,
    setActive,
    setReferenceElement,
    popperJs: popper,
    getPopperProps: {
      ref: popperElementRef,
      style: {
        ...popper.styles.popper,
        pointerEvents: active ? 'auto' : 'none',
        opacity: active ? 1 : 0,
      },
      ...popper.attributes.popper,
    },
  };
}
