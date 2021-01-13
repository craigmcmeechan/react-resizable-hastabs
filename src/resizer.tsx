import * as React from 'react';
import './index.css';

const prefixClass = 'react-resizable';
const HandlePrefixClass = `${prefixClass}-handle-`;

export type Direction = 'top' | 'right' | 'bottom' | 'left' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft';

export type OnStartCallback = (
  e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  dir: Direction,
) => void;

export interface Props {
  direction: Direction;
  className?: string;
  replaceStyles?: React.CSSProperties;
  children: React.ReactNode;
  disabled?: boolean;
  onResizeStart: OnStartCallback;
}

export class Resizer extends React.PureComponent<Props> {
  onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    this.props.onResizeStart(e, this.props.direction);
  };

  onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    this.props.onResizeStart(e, this.props.direction);
  };

  render() {
    return (
      <div
        className={`${HandlePrefixClass}${this.props.direction}`}
        style={{
          cursor: this.props.disabled ? 'not-allowed' : undefined,
        }}
        onMouseDown={this.onMouseDown}
        onTouchStart={this.onTouchStart}
      >
        {this.props.children}
      </div>
    );
  }
}
