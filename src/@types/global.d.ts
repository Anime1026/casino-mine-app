declare module '.jpg';
declare module '.svg';
declare module '.png';
declare module 'url:*' {
  export default string;
}
declare module '*.svg' {
  const content: any;
  export default content;
}
declare interface StoreObject {
  auth?: {
    userid: string;
    name: string;
    img: string;
    balance: number;
  };
  loading: boolean;
}
