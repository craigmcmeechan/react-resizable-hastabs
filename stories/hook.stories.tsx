import { storiesOf } from '@storybook/react';
import * as React from 'react';
import { Resizable } from '../src';
import { style } from './style';

storiesOf('hook', module).add('onResizeStart', () => {
  const [testStyle, setStyle] = React.useState<React.CSSProperties>({});
  return (
    <>
      <Resizable
        style={{ ...style, ...testStyle }}
        defaultWidth={200}
        defaultHeight={300}
        onResizeStart={({ width, height, direction }) => {
          setStyle({ background: 'green' });
        }}
        onResizeEnd={() => {
          setStyle(undefined);
        }}
      >
        001
      </Resizable>
    </>
  );
});

storiesOf('hook', module).add('onResize', () => {
  const [wh, setWh] = React.useState<React.CSSProperties>({
    width: 200,
    height: 300,
  });
  return (
    <>
      <Resizable
        style={{ ...style }}
        width={wh.width}
        height={wh.height}
        onResize={({ width, height, direction }) => {
          setWh({ width, height });
        }}
      >
        001
      </Resizable>
    </>
  );
});

storiesOf('hook', module).add('onResizeEnd', () => (
  <>
    <Resizable
      preview
      style={style}
      defaultWidth={200}
      defaultHeight={300}
      onResizeEnd={({ width, height, direction }) => {
        alert(`resizeEnd,width:${width},height:${height},direction:${direction}`);
      }}
    >
      001
    </Resizable>
  </>
));
