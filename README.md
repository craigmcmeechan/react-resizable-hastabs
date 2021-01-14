# React Quick Resizable

A resizable component improved from  [re-resizable](https://github.com/bokuweb/re-resizable).

Home page https://github.com/HaoxiangShen/react-quick-resizable

English | [简体中文](https://github.com/HaoxiangShen/react-quick-resizable/blob/master/README_zh.md).

## Background

**Important:React Quick Resizable is not built from scratch, but improved from re-resizable**

Here are the key improvements compare to the original re-resizable:
- Perform better when there are many child component.
- Added disabled property.
- Added preview property.

## Demo

[Storybook](https://haoxiangshen.github.io/)

## Props

#### `defaultWidth?: number | string;`

Specifies the `width` that the dragged item should start at.
For example, you can set `300`, `'300px'`, `50%`, `50vw`.
If both `defaultWidth` and `width` omitted, set `'auto'`.

`defaultWidth` will be ignored when `width` set.

#### `width: number | string`

The `width` property is used to set the width of the component.
For example, you can set `300`, `'300px'`, `50%`, `50vw`.

Use `width` if you need to control width state by yourself.

#### `defaultHeight?: number | string;`

Specifies the `height` that the dragged item should start at.
For example, you can set `300`, `'300px'`, `50%`, `50vh`.
If both `defaultHeight` and `height` omitted, set `'auto'`.

`defaultHeight` will be ignored when `height` set.

#### `height: number | string`

The `height` property is used to set the height of the component.
For example, you can set `300`, `'300px'`, `50%`, `50vh`.

Use `height` if you need to control width state by yourself.

#### `className?: string;`

The `className` property is used to set the custom `className` of a resizable component.

#### `style?: React.CSSProperties;`

The `style` property is used to set the custom `style` of a resizable component.

#### `minWidth?: number | string;`

The `minWidth` property is used to set the minimum width of a resizable component. Defaults to 10px.

It accepts viewport as well as parent relative units. For example, you can set `300`, `50%`, `50vw` or `50vh`.

Same type of values can be applied to `minHeight`, `maxWidth` and `maxHeight`.

#### `minHeight?: number | string;`

The `minHeight` property is used to set the minimum height of a resizable component. Defaults to 10px.

#### `maxWidth?: number | string;`

The `maxWidth` property is used to set the maximum width of a resizable component.

#### `maxHeight?: number | string`;

The `maxHeight` property is used to set the maximum height of a resizable component.

#### `scale?: number`;

The `scale` property is used in the scenario where the resizable element is a descendent of an element using css scaling (e.g. - `transform: scale(0.5)`).

#### `resizeRatio?: number | string;`

The `resizeRatio` property is used to set the number of pixels the resizable component scales by compared to the number of pixels the mouse/touch moves. Defaults to `1` (for a 1:1 ratio). The number set is the left side of the ratio, `2` will give a 2:1 ratio.

#### `lockAspectRatio?: boolean | number;`

The `lockAspectRatio` property is used to lock aspect ratio.
Set to `true` to lock the aspect ratio based on the initial size.
Set to a numeric value to lock a specific aspect ratio (such as `16/9`).
If set to numeric, make sure to set initial height/width to values with correct aspect ratio.
If omitted, set `false`.

#### `lockAspectRatioExtraWidth?: number;`

The `lockAspectRatioExtraWidth` property enables a resizable component to maintain an aspect ratio plus extra width.
For instance, a video could be displayed 16:9 with a 50px side bar.
If omitted, set `0`.

#### `lockAspectRatioExtraHeight?: number;`

The `lockAspectRatioExtraHeight` property enables a resizable component to maintain an aspect ratio plus extra height.
For instance, a video could be displayed 16:9 with a 50px header bar.
If omitted, set `0`.

#### `bounds?: ('window' | 'parent' | HTMLElement);`

Specifies resize boundaries.

#### `boundsByDirection?: boolean;`

By default max dimensions based on left and top element position.
Width grow to right side, height grow to bottom side.
Set `true` for detect max dimensions by direction.
For example: enable `boundsByDirection` when resizable component stick on right side of screen and you want resize by left handler;

`false` by default.

#### `handleComponent?: HandleComponent;`

The `handleComponent` property is used to pass a React Component to be rendered as one or more resize handle. For example, this could be used to use an arrow icon as a handle..

#### `directions?: Directions;`

The `directions` property is used to set the resizable permission of a resizable component.

The permission of `top`, `right`, `bottom`, `left`, `topRight`, `bottomRight`, `bottomLeft`, `topLeft` direction resizing.
If omitted, all resizer are enabled.
If you want to permit only right direction resizing, set `{ right:true }`.

#### `onResizeStart?: ResizeStartCallBack;`

Calls when resizable component resize start.

#### `onResize?: ResizeCallback;`

#### `onResizeStop?: ResizeCallback;`

#### `disabled?: boolean;`

Whether disabled resize.

#### `preview?: boolean;`

Preview before apply size.

#### `previewStyle?: React.CSSProperties;`

The `previewStyle` property is used to override the style of preview.

#### `previewClass?: string;`

The `previewClass` property is used to set the className preview.

