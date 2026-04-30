import * as React from 'react';

declare module 'react' {
  interface Attributes {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
}

declare global {
  namespace JSX {
    type Element = React.ReactElement<any, any>;
    interface ElementClass extends React.Component<any> {
      render(): React.ReactNode;
    }
    interface IntrinsicAttributes extends React.Attributes {
      className?: string;
      style?: React.CSSProperties;
      children?: React.ReactNode;
      [key: string]: any;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
