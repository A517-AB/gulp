declare module "*.css" {
  type IStyle = Record<string, string>;
  const style: IStyle;
  export default style;
}

