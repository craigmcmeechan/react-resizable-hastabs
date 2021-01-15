import { storiesOf } from '@storybook/react';
import * as React from 'react';
import { Resizable } from '../src';
import { style } from './style';

storiesOf('aspect', module).add('default', () => (
  <>
    <Resizable style={style} defaultWidth={200} defaultHeight={300}>
      001
    </Resizable>
  </>
));

storiesOf('aspect', module).add('preview', () => (
  <>
    <Resizable style={style} defaultWidth={200} defaultHeight={300} preview>
      001
    </Resizable>
  </>
));

storiesOf('aspect', module).add('disabled', () => (
  <>
    <Resizable style={style} defaultWidth={200} defaultHeight={300} disabled>
      001
    </Resizable>
  </>
));

storiesOf('aspect', module).add('flex', () => (
  <>
    <div style={{ display: 'flex', height: 400 }}>
      <Resizable style={style} defaultWidth={200} maxWidth="80%" directions={{ right: true }}>
        001
      </Resizable>
      <div style={{ ...style, flex: 1 }}>002</div>
    </div>
  </>
));

storiesOf('aspect', module).add('flexColumn', () => (
  <>
    <div style={{ display: 'flex', flexDirection: 'column', height: 600 }}>
      <Resizable style={style} defaultHeight={200} maxHeight="80%" directions={{ bottom: true }}>
        001
      </Resizable>
      <div style={{ ...style, flex: 1 }}>002</div>
    </div>
  </>
));
