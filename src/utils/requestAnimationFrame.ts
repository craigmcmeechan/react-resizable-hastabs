type RequestAnimationFrameType = typeof window.requestAnimationFrame;
type CancelAnimationFrame = typeof window.cancelAnimationFrame;

let requestAnimationFrame: RequestAnimationFrameType;
let cancelAnimationFrame: CancelAnimationFrame;

requestAnimationFrame =
  (typeof window !== 'undefined' &&
    ((window.requestAnimationFrame && window.requestAnimationFrame.bind(window)) ||
      // https://github.com/ecomfe/zrender/issues/189#issuecomment-224919809
      ((window as any).msRequestAnimationFrame && (window as any).msRequestAnimationFrame.bind(window)) ||
      (window as any).mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame)) ||
  function(func: Parameters<RequestAnimationFrameType>[0]): number {
    return setTimeout(func, 16) as any;
  };

cancelAnimationFrame =
  (typeof window !== 'undefined' &&
    ((window.cancelAnimationFrame && window.cancelAnimationFrame.bind(window)) ||
      // https://github.com/ecomfe/zrender/issues/189#issuecomment-224919809
      ((window as any).msCancelAnimationFrame && (window as any).msCancelAnimationFrame.bind(window)) ||
      (window as any).mozCancelAnimationFrame ||
      window.webkitCancelAnimationFrame)) ||
  window.clearTimeout;

export { requestAnimationFrame, cancelAnimationFrame };
