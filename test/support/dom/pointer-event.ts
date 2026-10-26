/**
 * jsdom has no native PointerEvent, so fireEvent.pointerX helpers drop clientX.
 * A MouseEvent under the pointer type name works: React dispatches on event.type.
 */
export const pointerEvent = (type: string, clientX: number) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
