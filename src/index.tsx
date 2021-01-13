import classnames from 'classnames';
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
  bounds?: 'window' | 'parent' | HTMLDivElement;
  width?: number | string;
  defaultWidth?: number | string;
  height?: number | string;
  defaultHeight?: number | string;
  directions?: Directions;
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
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
  'handleWrapperStyle',
  'onResize',
  'onResizeStart',
  'onResizeEnd',
];

export class Resizable extends React.PureComponent<ResizeProps, ResizeState> {
  resizable: HTMLElement | null = null;
  previewElement: HTMLElement | null = null;

  destroyed$ = new Subject<void>();
  resize$ = new Subject<Pick<ResizeEvent, 'event' | 'direction'>>();
  animationTimer: number | undefined;

  bakCusor: string | undefined;
  sizeCache: Size | undefined;

  get propsSize(): Size {
    const width = this.props.width || this.props.defaultWidth || DEFAULT_SIZE.width;
    const height = this.props.height || this.props.defaultHeight || DEFAULT_SIZE.height;
    return { width, height };
  }

  public static defaultProps: ResizeProps = {
    onResizeStart: () => {},
    onResize: () => {},
    onResizeEnd: () => {},
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

  handleResize() {
    this.resize$
      .pipe(
        tap(({ direction, event }) => {
          const { clientWidth, clientHeight } = this.resizable!;
          this.setState({ isResizing: true });
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
                  tap(e => this.endMove(e, direction)),
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
                  return;
                }
                const [width, height] = this.calculateNewSizeFromDirection(
                  direction,
                  [startClientX, startClientY],
                  [endClientX, endClientY],
                  [clientWidth, clientHeight],
                );
                const { onResize } = this.props;
                if (onResize) {
                  onResize({
                    width,
                    height,
                    direction,
                    event: (e as unknown) as React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
                  });
                }
                if (!this.props.preview) {
                  this.setState({ width, height });
                } else if (this.previewElement) {
                  this.sizeCache = { width, height };
                  this.previewResize(width, height);
                }
              });
            });
        }),
      )
      .pipe(takeUntil(this.destroyed$))
      .subscribe();
  }

  previewResize(width: number, height: number) {
    this.previewElement!.style.width = `${width}px`;
    this.previewElement!.style.height = `${height}px`;
  }

  calculateNewSizeFromDirection = (
    direction: Direction,
    startPosition: [number, number],
    endPosition: [number, number],
    originalSize: [number, number],
  ) => {
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

  endMove = (e: Event, direction: Direction) => {
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
      this.setState({ ...this.sizeCache }, () => {
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
