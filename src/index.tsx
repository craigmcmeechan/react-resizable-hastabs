import classnames from 'classnames';
import memoize from 'fast-memoize';
import * as React from 'react';
import { fromEvent, merge, Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import './index.css';
import { Direction, Resizer } from './resizer';
import hasDirection from './utils/hasDirection';
import isMouseEvent from './utils/isMouseEvent';
import isTouchEvent from './utils/isTouchEvent';
import { cancelAnimationFrame, requestAnimationFrame } from './utils/requestAnimationFrame';

const prefixClass = 'react-resizable';
const previewClass = `${prefixClass}-preview`;
const handleWrapperClass = `${prefixClass}-wrapper`;

const DEFAULT_SIZE = {
  width: 'auto',
  height: 'auto',
};

export type ResizeDirection = Direction;

export interface Size {
  width: number | string;
  height: number | string;
}

interface ResizeEvent {
  event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>;
  direction: Direction;
  width: number | string;
  height: number | string;
}

export interface Directions {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  topRight?: boolean;
  bottomRight?: boolean;
  bottomLeft?: boolean;
  topLeft?: boolean;
}

export interface HandleComponent {
  top?: React.ReactElement<any>;
  right?: React.ReactElement<any>;
  bottom?: React.ReactElement<any>;
  left?: React.ReactElement<any>;
  topRight?: React.ReactElement<any>;
  bottomRight?: React.ReactElement<any>;
  bottomLeft?: React.ReactElement<any>;
  topLeft?: React.ReactElement<any>;
}

export type ResizeCallback = (event: ResizeEvent) => void;

export type ResizeStartCallback = (event: ResizeEvent) => void | boolean;

export interface ResizeProps {
  style?: React.CSSProperties;
  className?: string;
  bounds?: 'parent' | 'window' | HTMLElement;
  boundsByDirection?: boolean;
  width?: number | string;
  defaultWidth?: number | string;
  height?: number | string;
  defaultHeight?: number | string;
  directions?: Directions;
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  resizeRatio?: number;
  scale?: number;
  lockAspectRatio?: boolean | number;
  lockAspectRatioExtraWidth?: number;
  lockAspectRatioExtraHeight?: number;
  preview?: boolean;
  previewStyle?: React.CSSProperties;
  previewClass?: string;
  disabled?: boolean;
  handleComponent?: HandleComponent;
  onResizeStart?: ResizeStartCallback;
  onResize?: ResizeCallback;
  onResizeEnd?: ResizeCallback;
}

interface ResizeState {
  isResizing: boolean;
  width: number | string;
  height: number | string;
}

const definedProps = [
  'style',
  'className',
  'bounds',
  'boundsByDirection',
  'width',
  'defaultWidth',
  'height',
  'defaultHeight',
  'directions',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'resizeRatio',
  'scale',
  'lockAspectRatio',
  'lockAspectRatioExtraWidth',
  'lockAspectRatioExtraHeight',
  'preview',
  'previewStyle',
  'previewClass',
  'disabled',
  'handleComponent',
  'onResizeStart',
  'onResize',
  'onResizeEnd',
];

// HACK: This class is used to calculate % size.
const baseClassName = '__resizable_base__';

export class Resizable extends React.PureComponent<ResizeProps, ResizeState> {
  resizable: HTMLElement | null = null;
  previewElement: HTMLElement | null = null;

  destroyed$ = new Subject<void>();
  resize$ = new Subject<Pick<ResizeEvent, 'event' | 'direction'>>();

  animationTimer: number | undefined;
  bakCusor: string | undefined;
  // preview Size
  sizeCache: { width: string | number; height: string | number } | undefined;

  ratio = 1;
  flexDir?: 'row' | 'column';
  parentWidth = 0;
  parentHeight = 0;

  // For parent boundary
  parentLeft = 0;
  parentTop = 0;
  // For boundary
  resizableLeft = 0;
  resizableRight = 0;
  resizableTop = 0;
  resizableBottom = 0;
  // For target boundary
  targetLeft = 0;
  targetTop = 0;

  get parentNode(): HTMLElement | null {
    if (!this.resizable) {
      return null;
    }
    return this.resizable.parentNode as HTMLElement;
  }

  get window(): Window | null {
    if (!this.resizable) {
      return null;
    }
    if (!this.resizable.ownerDocument) {
      return null;
    }
    return this.resizable.ownerDocument.defaultView as Window;
  }

  get propsSize(): Size {
    const width = this.props.width || this.props.defaultWidth || DEFAULT_SIZE.width;
    const height = this.props.height || this.props.defaultHeight || DEFAULT_SIZE.height;
    return { width, height };
  }

  public static defaultProps: ResizeProps = {
    onResizeStart: () => {},
    onResize: () => {},
    onResizeEnd: () => {},
    bounds: 'parent',
    boundsByDirection: true,
    directions: {
      top: true,
      right: true,
      bottom: true,
      left: true,
      topRight: true,
      bottomRight: true,
      bottomLeft: true,
      topLeft: true,
    },
    style: {},
    lockAspectRatio: false,
    disabled: false,
    preview: false,
    scale: 1,
    resizeRatio: 1,
    minWidth: 0,
    minHeight: 0,
  };

  constructor(props: ResizeProps) {
    super(props);
    this.state = {
      isResizing: false,
      width: this.propsSize.width,
      height: this.propsSize.height,
    };
  }

  componentDidMount() {
    this.handleResize();
  }

  componentWillUnmount() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  getParentSize(): { width: number; height: number } {
    if (!this.parentNode) {
      if (!this.window) {
        return { width: 0, height: 0 };
      }
      return { width: this.window.innerWidth, height: this.window.innerHeight };
    }
    const base = this.appendBase();
    if (!base) {
      return { width: 0, height: 0 };
    }
    // INFO: To calculate parent width with flex layout
    let wrapChanged = false;
    const wrap = this.parentNode.style.flexWrap;
    if (wrap !== 'wrap') {
      wrapChanged = true;
      this.parentNode.style.flexWrap = 'wrap';
      // HACK: Use relative to get parent padding size
    }
    base.style.position = 'relative';
    base.style.minWidth = '100%';
    const size = {
      width: base.offsetWidth,
      height: base.offsetHeight,
    };
    if (wrapChanged) {
      this.parentNode.style.flexWrap = wrap;
    }
    this.removeBase(base);
    return size;
  }

  appendBase = () => {
    if (!this.resizable || !this.window) {
      return null;
    }
    const parent = this.parentNode;
    if (!parent) {
      return null;
    }
    const element = this.window.document.createElement('div');
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.position = 'absolute';
    element.style.transform = 'scale(0, 0)';
    element.style.left = '0';
    element.style.flex = '0';
    if (element.classList) {
      element.classList.add(baseClassName);
    } else {
      element.className += baseClassName;
    }
    parent.appendChild(element);
    return element;
  };

  removeBase = (base: HTMLElement) => {
    const parent = this.parentNode;
    if (!parent) {
      return;
    }
    parent.removeChild(base);
  };

  setBoundingClientRect() {
    // For parent boundary
    if (this.props.bounds === 'parent') {
      const parent = this.parentNode;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        this.parentLeft = parentRect.left;
        this.parentTop = parentRect.top;
      }
    }

    // For target(html element) boundary
    if (this.props.bounds && typeof this.props.bounds !== 'string') {
      const targetRect = this.props.bounds.getBoundingClientRect();
      this.targetLeft = targetRect.left;
      this.targetTop = targetRect.top;
    }

    // For boundary
    if (this.resizable) {
      const { left, top, right, bottom } = this.resizable.getBoundingClientRect();
      this.resizableLeft = left;
      this.resizableRight = right;
      this.resizableTop = top;
      this.resizableBottom = bottom;
    }
  }

  handleResize() {
    this.resize$
      .pipe(
        tap(({ direction, event }) => {
          if (!this.resizable) {
            return;
          }
          const { clientWidth, clientHeight } = this.resizable;
          this.startResize(clientWidth, clientHeight);
          let startClientX = 0;
          let startClientY = 0;
          if (event.nativeEvent && isMouseEvent(event.nativeEvent)) {
            startClientX = event.nativeEvent.clientX;
            startClientY = event.nativeEvent.clientY;
            // When user click with right button the resize is stuck in resizing mode
            // until users clicks again, dont continue if right click is used.
            // HACK: MouseEvent does not have `which` from flow-bin v0.68.
            if (event.nativeEvent.which === 3) {
              return;
            }
          } else if (event.nativeEvent && isTouchEvent(event.nativeEvent)) {
            startClientX = (event.nativeEvent as TouchEvent).touches[0].clientX;
            startClientY = (event.nativeEvent as TouchEvent).touches[0].clientY;
          }
          this.bakCusor = document.body.style.cursor;
          merge(fromEvent(window, 'mousemove'), fromEvent(window, 'touchmove'))
            .pipe(
              takeUntil(
                merge(fromEvent(window, 'mouseup'), fromEvent(window, 'touchend')).pipe(
                  tap(e => this.endResize(e, direction)),
                ),
              ),
            )
            .subscribe(e => {
              const moveEvent: MouseEvent | TouchEvent = e as MouseEvent | TouchEvent;
              if (window.TouchEvent && isTouchEvent(moveEvent)) {
                try {
                  moveEvent.preventDefault();
                  moveEvent.stopPropagation();
                } catch (e) {
                  // Ignore on fail
                }
              }
              const endClientX = isTouchEvent(moveEvent) ? moveEvent.touches[0].clientX : moveEvent.clientX;
              const endClientY = isTouchEvent(moveEvent) ? moveEvent.touches[0].clientY : moveEvent.clientY;

              cancelAnimationFrame(this.animationTimer!);
              this.animationTimer = requestAnimationFrame(() => {
                if (this.props.disabled) {
                  this.endResize(e, direction);
                  return;
                }
                const [widthNum, heightNum] = this.getSize(
                  direction,
                  [startClientX, startClientY],
                  [endClientX, endClientY],
                  [clientWidth, clientHeight],
                );
                const [width, height] = this.getStringSize(widthNum, heightNum);

                if (this.props.preview && this.previewElement) {
                  this.sizeCache = { width, height };
                  this.previewResize(widthNum, heightNum);
                } else if (!this.props.preview) {
                  const { onResize } = this.props;
                  this.setSizeByDirection({ direction, width, height });
                  if (onResize) {
                    onResize({
                      width,
                      height,
                      direction,
                      event: (e as unknown) as React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
                    });
                  }
                }
              });
            });
        }),
      )
      .pipe(takeUntil(this.destroyed$))
      .subscribe();
  }

  setSizeByDirection(
    { direction, width, height }: { direction: Direction; width: number | string; height: number | string },
    callback?: () => void,
  ) {
    const newState: any = {};
    if (hasDirection('left', direction) || hasDirection('right', direction)) {
      newState.width = width;
    }
    if (hasDirection('top', direction) || hasDirection('bottom', direction)) {
      newState.height = height;
    }
    this.setState({ ...newState }, () => {
      callback && callback();
    });
  }

  previewResize(width: number, height: number) {
    this.previewElement!.style.width = `${width}px`;
    this.previewElement!.style.height = `${height}px`;
  }

  getStringSize = (width: number, height: number): [string | number, string | number] => {
    let newWidth: string | number = width;
    let newHeight: string | number = height;
    const { width: originalWidth, height: originalHeight } = this.state;
    if (originalWidth && typeof originalWidth === 'string') {
      if (endsWith(originalWidth, '%')) {
        const percent = (newWidth / this.parentWidth) * 100;
        newWidth = `${percent}%`;
      } else if (endsWith(originalWidth, 'vw')) {
        const vw = (newWidth / this.window!.innerWidth) * 100;
        newWidth = `${vw}vw`;
      } else if (endsWith(originalWidth, 'vh')) {
        const vh = (newWidth / this.window!.innerHeight) * 100;
        newWidth = `${vh}vh`;
      }
    }

    if (originalHeight && typeof originalHeight === 'string') {
      if (endsWith(originalHeight, '%')) {
        const percent = (newHeight / this.parentHeight) * 100;
        newHeight = `${percent}%`;
      } else if (endsWith(originalHeight, 'vw')) {
        const vw = (newHeight / this.window!.innerWidth) * 100;
        newHeight = `${vw}vw`;
      } else if (endsWith(originalHeight, 'vh')) {
        const vh = (newHeight / this.window!.innerHeight) * 100;
        newHeight = `${vh}vh`;
      }
    }
    return [newWidth, newHeight];
  };

  getSize = (
    direction: Direction,
    startPosition: [number, number],
    endPosition: [number, number],
    originalSize: [number, number],
  ): [number, number] => {
    let { maxWidth, maxHeight, minWidth, minHeight } = this.props;
    const max = calculateNewMax(
      { width: this.parentWidth, height: this.parentHeight },
      this.window!.innerWidth,
      this.window!.innerHeight,
      maxWidth,
      maxHeight,
      minWidth,
      minHeight,
    );
    maxWidth = max.maxWidth;
    maxHeight = max.maxHeight;
    minWidth = max.minWidth;
    minHeight = max.minHeight;
    let [newWidth, newHeight] = this.calculateNewSizeFromDirection(direction, startPosition, endPosition, originalSize);
    const boundaryMax = this.calculateNewMaxFromBoundary(direction, maxWidth, maxHeight);

    const newSize = this.calculateNewSizeFromAspectRatio(
      newWidth,
      newHeight,
      { width: boundaryMax.maxWidth, height: boundaryMax.maxHeight },
      { width: minWidth, height: minHeight },
    );
    newWidth = newSize.newWidth;
    newHeight = newSize.newHeight;

    return [newWidth, newHeight];
  };

  calculateNewSizeFromAspectRatio(
    newWidth: number,
    newHeight: number,
    max: { width?: number; height?: number },
    min: { width?: number; height?: number },
  ) {
    const { lockAspectRatio, lockAspectRatioExtraHeight, lockAspectRatioExtraWidth } = this.props;
    const computedMinWidth = typeof min.width === 'undefined' ? 0 : min.width;
    const computedMaxWidth = typeof max.width === 'undefined' || max.width < 0 ? newWidth : max.width;
    const computedMinHeight = typeof min.height === 'undefined' ? 0 : min.height;
    const computedMaxHeight = typeof max.height === 'undefined' || max.height < 0 ? newHeight : max.height;
    const extraHeight = lockAspectRatioExtraHeight || 0;
    const extraWidth = lockAspectRatioExtraWidth || 0;
    if (lockAspectRatio) {
      const extraMinWidth = (computedMinHeight - extraHeight) * this.ratio + extraWidth;
      const extraMaxWidth = (computedMaxHeight - extraHeight) * this.ratio + extraWidth;
      const extraMinHeight = (computedMinWidth - extraWidth) / this.ratio + extraHeight;
      const extraMaxHeight = (computedMaxWidth - extraWidth) / this.ratio + extraHeight;
      const lockedMinWidth = Math.max(computedMinWidth, extraMinWidth);
      const lockedMaxWidth = Math.min(computedMaxWidth, extraMaxWidth);
      const lockedMinHeight = Math.max(computedMinHeight, extraMinHeight);
      const lockedMaxHeight = Math.min(computedMaxHeight, extraMaxHeight);
      newWidth = clamp(newWidth, lockedMinWidth, lockedMaxWidth);
      newHeight = clamp(newHeight, lockedMinHeight, lockedMaxHeight);
    } else {
      newWidth = clamp(newWidth, computedMinWidth, computedMaxWidth);
      newHeight = clamp(newHeight, computedMinHeight, computedMaxHeight);
    }
    return { newWidth, newHeight };
  }

  calculateNewMaxFromBoundary(direction: Direction, maxWidth?: number, maxHeight?: number) {
    const { boundsByDirection } = this.props;
    const widthByDirection = boundsByDirection && hasDirection('left', direction);
    const heightByDirection = boundsByDirection && hasDirection('top', direction);
    let boundWidth;
    let boundHeight;
    if (this.props.bounds === 'parent') {
      const parent = this.parentNode;
      if (parent) {
        boundWidth = widthByDirection
          ? this.resizableRight - this.parentLeft
          : parent.offsetWidth + (this.parentLeft - this.resizableLeft);
        boundHeight = heightByDirection
          ? this.resizableBottom - this.parentTop
          : parent.offsetHeight + (this.parentTop - this.resizableTop);
      }
    } else if (this.props.bounds === 'window') {
      if (this.window) {
        boundWidth = widthByDirection ? this.resizableRight : this.window.innerWidth - this.resizableLeft;
        boundHeight = heightByDirection ? this.resizableBottom : this.window.innerHeight - this.resizableTop;
      }
    } else if (this.props.bounds) {
      boundWidth = widthByDirection
        ? this.resizableRight - this.targetLeft
        : this.props.bounds.offsetWidth + (this.targetLeft - this.resizableLeft);
      boundHeight = heightByDirection
        ? this.resizableBottom - this.targetTop
        : this.props.bounds.offsetHeight + (this.targetTop - this.resizableTop);
    }
    if (boundWidth && Number.isFinite(boundWidth)) {
      maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
    }
    if (boundHeight && Number.isFinite(boundHeight)) {
      maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
    }
    return { maxWidth, maxHeight };
  }

  calculateNewSizeFromDirection = (
    direction: Direction,
    startPosition: [number, number],
    endPosition: [number, number],
    originalSize: [number, number],
  ): [number, number] => {
    const scale = this.props.scale || 1;
    const resizeRatio = this.props.resizeRatio || 1;
    const {
      lockAspectRatio,
      lockAspectRatioExtraHeight: extraWidth = 0,
      lockAspectRatioExtraWidth: extraHeight = 0,
    } = this.props;

    const [startClientX, startClientY] = startPosition;
    const [endClientX, endClientY] = endPosition;
    const [originalWidth, originalHeight] = originalSize;
    let ratio = originalWidth / originalHeight;
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    if (hasDirection('right', direction)) {
      newWidth = originalWidth + ((endClientX - startClientX) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newHeight = (newWidth - extraWidth) / ratio + extraHeight;
      }
    }
    if (hasDirection('left', direction)) {
      newWidth = originalWidth - ((endClientX - startClientX) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newHeight = (newWidth - extraWidth) / ratio + extraHeight;
      }
    }
    if (hasDirection('bottom', direction)) {
      newHeight = originalHeight + ((endClientY - startClientY) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newWidth = (newHeight - extraHeight) * ratio + extraWidth;
      }
    }
    if (hasDirection('top', direction)) {
      newHeight = originalHeight - ((endClientY - startClientY) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newWidth = (newHeight - extraHeight) * ratio + extraWidth;
      }
    }
    return [newWidth, newHeight];
  };

  startResize = (width: number, height: number) => {
    this.setState({ isResizing: true });
    this.setBoundingClientRect();
    // For lockAspectRatio case
    this.ratio = typeof this.props.lockAspectRatio === 'number' ? this.props.lockAspectRatio : width / height;
    let parentSize = this.getParentSize();
    this.parentWidth = parentSize.width;
    this.parentHeight = parentSize.height;
    const parent = this.parentNode;
    if (parent) {
      const dir = this.window!.getComputedStyle(parent).flexDirection;
      this.flexDir = dir.startsWith('row') ? 'row' : 'column';
    }
  };

  endResize = (e: Event, direction: Direction) => {
    const callback = () => {
      const { onResizeEnd } = this.props;
      if (onResizeEnd) {
        onResizeEnd({
          width: this.state.width,
          height: this.state.height,
          event: (e as unknown) as React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
          direction,
        });
      }
    };
    this.setState({ isResizing: false });
    document.body.style.cursor = this.bakCusor!;
    if (this.sizeCache) {
      this.setSizeByDirection({ ...this.sizeCache, direction }, () => {
        this.sizeCache = undefined;
        callback();
      });
    } else {
      callback();
    }
  };

  onResizeStart = (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    direction: Direction,
  ) => {
    if (this.props.disabled) {
      return;
    }

    if (this.props.onResizeStart) {
      if (this.resizable) {
        const { width, height } = this.state;
        const startResize = this.props.onResizeStart({
          event,
          direction,
          width,
          height,
        });
        if (startResize === false) {
          return;
        }
      }
    }
    this.resize$.next({ event, direction });
  };

  renderResizer() {
    const { directions, disabled, handleComponent } = this.props;
    if (!directions) {
      return null;
    }
    const resizers = Object.keys(directions).map(dir => {
      if (directions[dir as Direction] !== false) {
        return (
          <Resizer key={dir} direction={dir as Direction} disabled={disabled} onResizeStart={this.onResizeStart}>
            {handleComponent && handleComponent[dir as Direction] ? handleComponent[dir as Direction] : null}
          </Resizer>
        );
      }
      return null;
    });
    // #93 Wrap the resize box in span (will not break 100% width/height)
    return <div className={handleWrapperClass}>{resizers}</div>;
  }

  ref = (c: HTMLElement | null) => {
    if (c) {
      this.resizable = c;
    }
  };
  previewRef = (c: HTMLElement | null) => {
    if (c) {
      this.previewElement = c;
    }
  };

  render() {
    const extendsProps = Object.keys(this.props).reduce((acc, key) => {
      if (definedProps.indexOf(key) !== -1) {
        return acc;
      }
      acc[key] = this.props[key as keyof ResizeProps];
      return acc;
    }, {} as { [key: string]: any });

    const style: React.CSSProperties = {
      position: 'relative',
      userSelect: this.state.isResizing ? 'none' : 'auto',
      ...this.props.style,
      maxWidth: this.props.maxWidth,
      maxHeight: this.props.maxHeight,
      minWidth: this.props.minWidth,
      minHeight: this.props.minHeight,
      boxSizing: 'border-box',
      flexShrink: 0,
      width: this.props.width || this.state.width,
      height: this.props.height || this.state.height,
    };
    if (this.flexDir) {
      style.flexBasis = this.flexDir === 'row' ? style.width : style.height;
    }

    return (
      <div {...extendsProps} ref={this.ref} style={style} className={this.props.className}>
        {this.state.isResizing && <div />}
        {this.props.children}
        {this.renderResizer()}
        {this.props.preview && this.state.isResizing && (
          <div
            ref={this.previewRef}
            className={classnames(this.props.previewClass, previewClass)}
            style={{
              ...(this.props.previewStyle || {}),
            }}
          />
        )}
      </div>
    );
  }
}

const calculateNewMax = memoize(
  (
    parentSize: { width: number; height: number },
    innerWidth: number,
    innerHeight: number,
    maxWidth?: string | number,
    maxHeight?: string | number,
    minWidth?: string | number,
    minHeight?: string | number,
  ) => {
    maxWidth = getPixelSize(maxWidth, parentSize.width, innerWidth, innerHeight);
    maxHeight = getPixelSize(maxHeight, parentSize.height, innerWidth, innerHeight);
    minWidth = getPixelSize(minWidth, parentSize.width, innerWidth, innerHeight);
    minHeight = getPixelSize(minHeight, parentSize.height, innerWidth, innerHeight);
    return {
      maxWidth: typeof maxWidth === 'undefined' ? undefined : Number(maxWidth),
      maxHeight: typeof maxHeight === 'undefined' ? undefined : Number(maxHeight),
      minWidth: typeof minWidth === 'undefined' ? undefined : Number(minWidth),
      minHeight: typeof minHeight === 'undefined' ? undefined : Number(minHeight),
    };
  },
);

const getPixelSize = (
  size: undefined | string | number,
  parentSize: number,
  innerWidth: number,
  innerHeight: number,
): undefined | string | number => {
  if (size && typeof size === 'string') {
    if (endsWith(size, 'px')) {
      return Number(size.replace('px', ''));
    }
    if (endsWith(size, '%')) {
      const ratio = Number(size.replace('%', '')) / 100;
      return parentSize * ratio;
    }
    if (endsWith(size, 'vw')) {
      const ratio = Number(size.replace('vw', '')) / 100;
      return innerWidth * ratio;
    }
    if (endsWith(size, 'vh')) {
      const ratio = Number(size.replace('vh', '')) / 100;
      return innerHeight * ratio;
    }
  }
  return size;
};

const endsWith = memoize(
  (str: string, searchStr: string): boolean =>
    str.substr(str.length - searchStr.length, searchStr.length) === searchStr,
);

const clamp = memoize((n: number, min: number, max: number): number => Math.max(Math.min(n, max), min));
