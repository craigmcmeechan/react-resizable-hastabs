export default (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return Boolean((event as TouchEvent).touches && (event as TouchEvent).touches.length);
};
