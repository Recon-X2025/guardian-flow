/// <reference types="vite/client" />

declare global {
  interface Window {
    React?: typeof import('react');
  }
}

export {};
