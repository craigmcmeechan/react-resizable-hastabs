export default (event: MouseEvent | TouchEvent): event is MouseEvent => {
  return Boolean(
    ((event as MouseEvent).clientX || (event as MouseEvent).clientX === 0) &&
      ((event as MouseEvent).clientY || (event as MouseEvent).clientY === 0),
  );
};
