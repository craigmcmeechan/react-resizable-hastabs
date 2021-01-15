# React Quick Resizable

一个可调整尺寸组件，从 [re-resizable](https://github.com/bokuweb/re-resizable)改进而来.

主页 https://github.com/HaoxiangShen/react-quick-resizable

[English](https://github.com/HaoxiangShen/react-quick-resizable/blob/master/README.md) | 简体中文.

## 背景

**重要:React Quick Resizable 不是从零开始构建的, 它从re-resizable改进而来**

下面是相较于原版优化及增加的特性:
- 在大量子组件嵌套的情况下表现更好，主要使用requestAnimationFrame及rxjs优化.
- 增加了禁用属性.
- 增加了预览属性.

## Demo

[Storybook](https://haoxiangshen.github.io/)

## 属性

#### `defaultWidth?: number | string;`

默认宽度.
可以设置为 `300`, `300px`, `50%`, `50vw`.

`defaultWidth` 会被忽略，如果设置了 `width`.

#### `width: number | string`

宽度.
可以设置为 `300`, `300px`, `50%`, `50vw`.

手动控制宽度.

#### `defaultHeight?: number | string;`

默认高度.
可以设置为 `300`, `300px`, `50%`, `50vh`.

`defaultHeight` 会被忽略，如果设置了 `height`.

#### `height: number | string`

高度.
可以设置为 `300`, `300px`, `50%`, `50vh`.

手动控制高度.


#### `className?: string;`

类名.

#### `style?: React.CSSProperties;`

样式.

#### `minWidth?: number | string;`

最小宽度. 默认值 0.

可以设置为 `300`, `300px`, `50%`, `50vw`.

#### `minHeight?: number | string;`

最小高度. 默认值 0.

#### `maxWidth?: number | string;`

最大宽度.

#### `maxHeight?: number | string`;

最大高度.

#### `scale?: number`;

缩放比例,使用 (e.g. - `transform: scale(0.5)`)css.

#### `resizeRatio?: number | string;`

宽高比例，默认1.

#### `lockAspectRatio?: boolean | number;`

是否锁定宽高比

#### `lockAspectRatioExtraWidth?: number;`

锁定宽高比后，额外的宽度

#### `lockAspectRatioExtraHeight?: number;`

锁定宽高比后，额外的高度

#### `bounds?: ('window' | 'parent' | HTMLElement);`

组件调整大小的边界

#### `boundsByDirection?: boolean;`

By default max dimensions based on left and top element position.
Width grow to right side, height grow to bottom side.
Set `true` for detect max dimensions by direction.
For example: enable `boundsByDirection` when resizable component stick on right side of screen and you want resize by left handler;

`false` by default.

#### `handleComponent?: HandleComponent;`

手柄组件. 如果仅需要调整样式，可覆盖 react-resizable-handle-top等样式。

#### `directions?: Directions;`

可调整大小的方向.

可选方向 `top`, `right`, `bottom`, `left`, `topRight`, `bottomRight`, `bottomLeft`, `topLeft`.
默认值为全部方向。
如果只希望单个方向可用，可设置为 `{ right:true }`.

#### `onResizeStart?: ResizeStartCallBack;`.

#### `onResize?: ResizeCallback;`

#### `onResizeStop?: ResizeCallback;`

#### `disabled?: boolean;`

是否禁用.

#### `preview?: boolean;`

是否预览.

#### `previewStyle?: React.CSSProperties;`

预览元素样式.

#### `previewClass?: string;`

预览元素类.

